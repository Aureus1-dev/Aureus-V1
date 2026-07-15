import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AnnouncementScope, AnnouncementStatus, NotificationCategory, OrganizationMemberRole, StewardshipRelationshipStatus, UserRole, UserStatus, VerificationStatus } from '@prisma/client';
import type { Announcement } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/communication-roles.util';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { ListAnnouncementsQueryDto } from './dto/list-announcements-query.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { PaginatedAnnouncementsResponseDto } from './dto/paginated-announcements-response.dto';
import { ANNOUNCEMENT_REPOSITORY, IAnnouncementRepository } from './repositories/announcement.repository.interface';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../../organizations/repositories/organization.repository.interface';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../../organizations/members/repositories/organization-member.repository.interface';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../../stewardship/relationships/repositories/stewardship-relationship.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../users/repositories/user.repository.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly repo: IAnnouncementRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgRepo: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY) private readonly orgMemberRepo: IOrganizationMemberRepository,
    @Inject(STEWARDSHIP_RELATIONSHIP_REPOSITORY) private readonly relationshipRepo: IStewardshipRelationshipRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateAnnouncementDto, caller: AuthenticatedUser): Promise<AnnouncementResponseDto> {
    await this.assertCanAuthor(dto.scope, dto, caller);

    const created = await this.repo.create({
      title: dto.title,
      body: dto.body,
      scope: dto.scope,
      organizationId: dto.scope === AnnouncementScope.ORGANIZATION ? dto.organizationId : undefined,
      targetRole: dto.scope === AnnouncementScope.ROLE ? dto.targetRole : undefined,
      stewardId: dto.scope === AnnouncementScope.STEWARD_MEMBERS ? (dto.stewardId ?? caller.id) : undefined,
      isCritical: dto.isCritical,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      authorId: caller.id,
    });
    return AnnouncementResponseDto.fromEntity(created);
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<AnnouncementResponseDto> {
    const announcement = await this.repo.findById(id);
    if (!announcement) throw new NotFoundException(`Announcement '${id}' not found`);
    await this.assertVisible(announcement, caller);
    return AnnouncementResponseDto.fromEntity(announcement);
  }

  /** Administrators/authors see the full lifecycle; everyone else sees only PUBLISHED announcements addressed to them. */
  async findAll(query: ListAnnouncementsQueryDto, caller: AuthenticatedUser): Promise<PaginatedAnnouncementsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      const result = await this.repo.findAll({ page, limit, scope: query.scope, status: query.status, organizationId: query.organizationId });
      return this.toPaginatedDto(result);
    }

    const [orgMemberships, relationships] = await Promise.all([
      this.orgMemberRepo.findByUser(caller.id),
      this.relationshipRepo.findAll({ page: 1, limit: 1000, memberId: caller.id, status: StewardshipRelationshipStatus.ACTIVE }),
    ]);
    const organizationIds = orgMemberships.map((m) => m.organizationId);
    const stewardIds = relationships.data.map((r) => r.stewardId).filter((id): id is string => !!id);

    const result = await this.repo.findVisibleForUser({ page, limit, organizationIds, roles: caller.roles as UserRole[], stewardIds });
    return this.toPaginatedDto(result);
  }

  async update(id: string, dto: UpdateAnnouncementDto, caller: AuthenticatedUser): Promise<AnnouncementResponseDto> {
    const announcement = await this.repo.findById(id);
    if (!announcement) throw new NotFoundException(`Announcement '${id}' not found`);
    if (announcement.status !== AnnouncementStatus.DRAFT) {
      throw new ConflictException('Only a DRAFT announcement may be edited');
    }
    await this.assertCanAuthor(announcement.scope, announcement, caller);

    const updated = await this.repo.update(id, {
      title: dto.title,
      body: dto.body,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      isCritical: dto.isCritical,
    });
    return AnnouncementResponseDto.fromEntity(updated);
  }

  /** Publishes a DRAFT/SCHEDULED announcement and fans out one Notification per resolved recipient. */
  async publish(id: string, caller: AuthenticatedUser): Promise<AnnouncementResponseDto> {
    const announcement = await this.repo.findById(id);
    if (!announcement) throw new NotFoundException(`Announcement '${id}' not found`);
    if (announcement.status !== AnnouncementStatus.DRAFT && announcement.status !== AnnouncementStatus.SCHEDULED) {
      throw new ConflictException(`Announcement is '${announcement.status}'. Only DRAFT or SCHEDULED announcements can be published.`);
    }
    await this.assertCanAuthor(announcement.scope, announcement, caller);

    const published = await this.repo.updateStatus(id, AnnouncementStatus.PUBLISHED, { publishedAt: new Date() });
    await this.fanOut(published);
    return AnnouncementResponseDto.fromEntity(published);
  }

  async archive(id: string, caller: AuthenticatedUser): Promise<AnnouncementResponseDto> {
    const announcement = await this.repo.findById(id);
    if (!announcement) throw new NotFoundException(`Announcement '${id}' not found`);
    await this.assertCanAuthor(announcement.scope, announcement, caller);

    const updated = await this.repo.updateStatus(id, AnnouncementStatus.ARCHIVED, { archivedAt: new Date() });
    return AnnouncementResponseDto.fromEntity(updated);
  }

  // ── Audience resolution + fan-out ────────────────────────────────────────

  private async fanOut(announcement: Announcement): Promise<void> {
    const recipientIds = await this.resolveAudience(announcement);
    for (const recipientId of recipientIds) {
      try {
        await this.notificationsService.notify({
          recipientId,
          category: NotificationCategory.ANNOUNCEMENT,
          type: 'announcement.published',
          title: announcement.title,
          body: announcement.body,
          actorId: announcement.authorId,
          dedupeKey: `announcement:${announcement.id}`,
          expiresAt: announcement.expiresAt ?? undefined,
          bypassPreferences: announcement.isCritical,
        });
      } catch (err) {
        this.logger.warn(`Failed to notify recipient ${recipientId} for announcement ${announcement.id}: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }
  }

  private async resolveAudience(announcement: Announcement): Promise<string[]> {
    switch (announcement.scope) {
      case AnnouncementScope.PLATFORM: {
        const result = await this.userRepo.findAll({ page: 1, limit: 1000, status: UserStatus.ACTIVE });
        return result.data.map((u) => u.id);
      }
      case AnnouncementScope.ORGANIZATION: {
        if (!announcement.organizationId) return [];
        const members = await this.orgMemberRepo.findByOrganization(announcement.organizationId);
        return members.map((m) => m.userId);
      }
      case AnnouncementScope.ROLE: {
        if (!announcement.targetRole) return [];
        const result = await this.userRepo.findAll({ page: 1, limit: 1000, status: UserStatus.ACTIVE, role: announcement.targetRole });
        return result.data.map((u) => u.id);
      }
      case AnnouncementScope.STEWARD_MEMBERS: {
        if (!announcement.stewardId) return [];
        const result = await this.relationshipRepo.findAll({
          page: 1, limit: 1000, stewardId: announcement.stewardId, status: StewardshipRelationshipStatus.ACTIVE,
        });
        return result.data.map((r) => r.memberId);
      }
      default:
        return [];
    }
  }

  // ── Authorization ─────────────────────────────────────────────────────

  private async assertCanAuthor(
    scope: AnnouncementScope,
    fields: { organizationId?: string | null; targetRole?: UserRole | null; stewardId?: string | null },
    caller: AuthenticatedUser,
  ): Promise<void> {
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;

    switch (scope) {
      case AnnouncementScope.PLATFORM:
      case AnnouncementScope.ROLE:
        throw new ForbiddenException('Only a Platform/System Administrator may author this announcement scope');

      case AnnouncementScope.ORGANIZATION: {
        if (!fields.organizationId) throw new BadRequestException('organizationId is required for scope=ORGANIZATION');
        const org = await this.orgRepo.findById(fields.organizationId);
        if (!org) throw new NotFoundException(`Organization '${fields.organizationId}' not found`);
        if (org.verificationStatus !== VerificationStatus.VERIFIED) {
          throw new ForbiddenException('Only a verified organization may publish announcements');
        }
        const membership = await this.orgMemberRepo.findByOrgAndUser(fields.organizationId, caller.id);
        if (!membership || membership.role !== OrganizationMemberRole.ADMIN) {
          throw new ForbiddenException('You must be an ADMIN representative of this organization');
        }
        return;
      }

      case AnnouncementScope.STEWARD_MEMBERS: {
        if (!hasRole(caller, [UserRole.STEWARD])) {
          throw new ForbiddenException('Only a Steward may author a STEWARD_MEMBERS announcement');
        }
        if (fields.stewardId && fields.stewardId !== caller.id) {
          throw new ForbiddenException('A Steward may only announce to their own assigned members');
        }
        return;
      }

      default:
        throw new ForbiddenException('You do not have permission to author this announcement');
    }
  }

  private async assertVisible(announcement: Announcement, caller: AuthenticatedUser): Promise<void> {
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;
    if (announcement.authorId === caller.id) return;

    if (announcement.status !== AnnouncementStatus.PUBLISHED) {
      throw new ForbiddenException('This announcement is not yet published');
    }

    switch (announcement.scope) {
      case AnnouncementScope.PLATFORM:
        return;
      case AnnouncementScope.ORGANIZATION: {
        if (!announcement.organizationId) break;
        const membership = await this.orgMemberRepo.findByOrgAndUser(announcement.organizationId, caller.id);
        if (membership) return;
        break;
      }
      case AnnouncementScope.ROLE:
        if (announcement.targetRole && caller.roles.includes(announcement.targetRole)) return;
        break;
      case AnnouncementScope.STEWARD_MEMBERS: {
        if (!announcement.stewardId) break;
        const relationships = await this.relationshipRepo.findAll({
          page: 1, limit: 1, memberId: caller.id, stewardId: announcement.stewardId, status: StewardshipRelationshipStatus.ACTIVE,
        });
        if (relationships.total > 0) return;
        break;
      }
      default:
        break;
    }
    throw new ForbiddenException('You are not in the audience for this announcement');
  }

  private toPaginatedDto(result: { data: Announcement[]; total: number; page: number; limit: number }): PaginatedAnnouncementsResponseDto {
    return {
      data: result.data.map(AnnouncementResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }
}
