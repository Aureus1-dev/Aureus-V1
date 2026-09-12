import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationMemberRole, Prisma, TenantAuditAction, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from './repositories/organization-member.repository.interface';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../repositories/organization.repository.interface';

const MODERATOR_ROLES: UserRole[] = [
  UserRole.STEWARD,
  UserRole.PLATFORM_ADMINISTRATOR,
  UserRole.SYSTEM_ADMINISTRATOR,
];
const MANAGING_MEMBER_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
];

@Injectable()
export class OrganizationMembersService {
  constructor(
    @Inject(ORGANIZATION_MEMBER_REPOSITORY) private readonly repo: IOrganizationMemberRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgRepo: IOrganizationRepository,
    private readonly prisma: PrismaService,
  ) {}

  async add(
    organizationId: string,
    dto: AddMemberDto,
    caller: AuthenticatedUser,
  ): Promise<MemberResponseDto> {
    await this.assertOrgExists(organizationId);
    this.assertPlatformPrivileged(caller);

    if (dto.role === OrganizationMemberRole.OWNER) {
      throw new BadRequestException(
        'OWNER cannot be granted by direct attach — use the explicit ownership-transfer action',
      );
    }

    const existing = await this.repo.findByOrgAndUser(organizationId, dto.userId);
    if (existing) {
      throw new ConflictException(`User '${dto.userId}' is already a member of this organization`);
    }

    const role = dto.role ?? OrganizationMemberRole.MEMBER;
    const member = await this.repo.add({ organizationId, userId: dto.userId, role });

    await this.audit(organizationId, caller.id, TenantAuditAction.MEMBER_ADDED, member.id, {
      userId: dto.userId,
      role,
    });

    return MemberResponseDto.fromEntity(member);
  }

  async findByOrganization(
    organizationId: string,
    caller: AuthenticatedUser,
  ): Promise<MemberResponseDto[]> {
    await this.assertOrgExists(organizationId);

    if (!hasRole(caller, MODERATOR_ROLES)) {
      const membership = await this.repo.findByOrgAndUser(organizationId, caller.id);
      if (!membership) {
        throw new ForbiddenException(
          "You do not have permission to view this organization's members",
        );
      }
    }

    const members = await this.repo.findByOrganization(organizationId);
    return members.map(MemberResponseDto.fromEntity);
  }

  async updateRole(
    organizationId: string,
    userId: string,
    dto: UpdateMemberDto,
    caller: AuthenticatedUser,
  ): Promise<MemberResponseDto> {
    await this.assertOrgExists(organizationId);
    await this.assertIsOrgAdminOrPrivileged(organizationId, caller);

    if (dto.role === OrganizationMemberRole.OWNER) {
      throw new BadRequestException(
        'Ownership can only be granted through the explicit ownership-transfer action',
      );
    }

    const target = await this.repo.findByOrgAndUser(organizationId, userId);
    if (!target)
      throw new NotFoundException(`User '${userId}' is not a member of this organization`);

    if (target.role === OrganizationMemberRole.OWNER) {
      throw new ConflictException(
        "Cannot change an OWNER through generic role editing — transfer ownership first",
      );
    }

    if (MANAGING_MEMBER_ROLES.includes(target.role) && !MANAGING_MEMBER_ROLES.includes(dto.role)) {
      const adminCount = await this.repo.countAdmins(organizationId);
      if (adminCount <= 1) {
        throw new ConflictException(
          "Cannot demote the organization's last remaining ADMIN representative",
        );
      }
    }

    const updated = await this.repo.updateRole(organizationId, userId, dto.role);

    await this.audit(organizationId, caller.id, TenantAuditAction.MEMBER_ROLE_CHANGED, updated.id, {
      userId,
      fromRole: target.role,
      toRole: dto.role,
    });

    return MemberResponseDto.fromEntity(updated);
  }

  async remove(organizationId: string, userId: string, caller: AuthenticatedUser): Promise<void> {
    await this.assertOrgExists(organizationId);

    const isSelf = caller.id === userId;
    if (!isSelf) {
      await this.assertIsOrgAdminOrPrivileged(organizationId, caller);
    }

    const target = await this.repo.findByOrgAndUser(organizationId, userId);
    if (!target)
      throw new NotFoundException(`User '${userId}' is not a member of this organization`);

    if (MANAGING_MEMBER_ROLES.includes(target.role)) {
      const adminCount = await this.repo.countAdmins(organizationId);
      if (adminCount <= 1) {
        throw new ConflictException(
          "Cannot remove the organization's last remaining ADMIN representative",
        );
      }
    }

    if (target.role === OrganizationMemberRole.OWNER) {
      const ownerCount = await this.repo.countOwners(organizationId);
      if (ownerCount <= 1) {
        throw new ConflictException(
          "Cannot remove the organization's sole owner — transfer ownership to another member first",
        );
      }
    }

    await this.repo.remove(organizationId, userId);

    await this.audit(organizationId, caller.id, TenantAuditAction.MEMBER_REMOVED, target.id, {
      userId,
      role: target.role,
      self: isSelf,
    });
  }

  /**
   * The only ordinary path that creates a new OWNER after organization
   * creation. Platform moderation roles do not implicitly become company
   * ownership authority. The organization row is locked first so concurrent
   * transfer attempts serialize; OWNER authority is then re-read inside the
   * same transaction, after the lock, before any ownership mutation occurs.
   */
  async transferOwnership(
    organizationId: string,
    dto: TransferOwnershipDto,
    caller: AuthenticatedUser,
  ): Promise<MemberResponseDto> {
    await this.assertOrgExists(organizationId);

    const newOwner = await this.prisma.db.$transaction(async (tx) => {
      // Serialize every ownership transfer for this company. A second request
      // waits here; after the first commits it re-checks the caller's current
      // membership and therefore cannot act using stale OWNER authority.
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = CAST(${organizationId} AS uuid) FOR UPDATE`,
      );

      const callerMembership = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: caller.id } },
      });
      if (!callerMembership || callerMembership.role !== OrganizationMemberRole.OWNER) {
        throw new ForbiddenException("Only the organization's current OWNER may perform this action");
      }

      const target = await tx.organizationMember.findUnique({
        where: {
          organizationId_userId: { organizationId, userId: dto.newOwnerUserId },
        },
      });
      if (!target) {
        throw new NotFoundException(
          `User '${dto.newOwnerUserId}' is not a member of this organization`,
        );
      }
      if (target.role === OrganizationMemberRole.OWNER) {
        throw new ConflictException(
          `User '${dto.newOwnerUserId}' is already an OWNER of this organization`,
        );
      }

      const priorOwners = await tx.organizationMember.findMany({
        where: { organizationId, role: OrganizationMemberRole.OWNER },
        select: { userId: true },
      });

      await tx.organizationMember.updateMany({
        where: {
          organizationId,
          role: OrganizationMemberRole.OWNER,
          userId: { not: dto.newOwnerUserId },
        },
        data: { role: OrganizationMemberRole.ADMIN },
      });

      const updated = await tx.organizationMember.update({
        where: { organizationId_userId: { organizationId, userId: dto.newOwnerUserId } },
        data: { role: OrganizationMemberRole.OWNER },
      });

      await tx.tenantAuditEvent.create({
        data: {
          organizationId,
          actorId: caller.id,
          action: TenantAuditAction.OWNERSHIP_TRANSFERRED,
          resourceType: 'OrganizationMember',
          resourceId: updated.id,
          context: {
            fromUserId: caller.id,
            toUserId: dto.newOwnerUserId,
            demotedOwnerUserIds: priorOwners
              .map((owner) => owner.userId)
              .filter((userId) => userId !== dto.newOwnerUserId),
          },
        },
      });

      return updated;
    });

    return MemberResponseDto.fromEntity(newOwner);
  }

  private async audit(
    organizationId: string,
    actorId: string,
    action: TenantAuditAction,
    resourceId: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.db.tenantAuditEvent.create({
      data: {
        organizationId,
        actorId,
        action,
        resourceType: 'OrganizationMember',
        resourceId,
        context: JSON.parse(JSON.stringify(context)) as Prisma.InputJsonValue,
      },
    });
  }

  private async assertOrgExists(organizationId: string): Promise<void> {
    const org = await this.orgRepo.findById(organizationId);
    if (!org) throw new NotFoundException(`Organization '${organizationId}' not found`);
  }

  private assertPlatformPrivileged(caller: AuthenticatedUser): void {
    if (!hasRole(caller, MODERATOR_ROLES)) {
      throw new ForbiddenException(
        'Only a platform Steward or Administrator may attach a member directly; use an invitation instead',
      );
    }
  }

  private async assertIsOrgAdminOrPrivileged(
    organizationId: string,
    caller: AuthenticatedUser,
  ): Promise<void> {
    if (hasRole(caller, MODERATOR_ROLES)) return;

    const membership = await this.repo.findByOrgAndUser(organizationId, caller.id);
    if (!membership || !MANAGING_MEMBER_ROLES.includes(membership.role)) {
      throw new ForbiddenException(
        "You do not have permission to manage this organization's members",
      );
    }
  }
}
