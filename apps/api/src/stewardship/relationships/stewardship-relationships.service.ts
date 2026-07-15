import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationMemberRole,
  StewardshipEndReason,
  StewardshipRelationshipOrigin,
  StewardshipRelationshipStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import type { StewardshipRelationship } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/stewardship-roles.util';
import { RequestStewardDto } from './dto/request-steward.dto';
import { RecommendStewardDto } from './dto/recommend-steward.dto';
import { OrganizationAssignStewardDto } from './dto/organization-assign-steward.dto';
import { AdminAssignStewardDto } from './dto/admin-assign-steward.dto';
import { ActivateRelationshipDto } from './dto/activate-relationship.dto';
import { EndRelationshipDto } from './dto/end-relationship.dto';
import { ReassignRelationshipDto } from './dto/reassign-relationship.dto';
import { ListRelationshipsQueryDto } from './dto/list-relationships-query.dto';
import { RelationshipResponseDto } from './dto/relationship-response.dto';
import { PaginatedRelationshipsResponseDto } from './dto/paginated-relationships-response.dto';
import { MemberOverviewResponseDto } from './dto/member-overview-response.dto';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from './repositories/stewardship-relationship.repository.interface';
import { IStewardCapacityRepository, STEWARD_CAPACITY_REPOSITORY } from '../capacity/repositories/steward-capacity.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../users/repositories/user.repository.interface';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../../organizations/repositories/organization.repository.interface';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../../organizations/members/repositories/organization-member.repository.interface';
import { IGoalRepository, GOAL_REPOSITORY } from '../../goals/repositories/goal.repository.interface';
import { IJourneyRepository, JOURNEY_REPOSITORY } from '../../journeys/repositories/journey.repository.interface';
import { IMilestoneRepository, MILESTONE_REPOSITORY } from '../../milestones/repositories/milestone.repository.interface';
import { ITaskRepository, TASK_REPOSITORY } from '../../tasks/repositories/task.repository.interface';
import { ProfileService } from '../../users/profile/profile.service';
import { GoalResponseDto } from '../../goals/dto/goal-response.dto';
import { JourneyResponseDto } from '../../journeys/dto/journey-response.dto';
import { MilestoneResponseDto } from '../../milestones/dto/milestone-response.dto';
import { TaskResponseDto } from '../../tasks/dto/task-response.dto';

const REASSIGNMENT_REASONS: StewardshipEndReason[] = [
  StewardshipEndReason.ORGANIZATION_REASSIGNMENT,
  StewardshipEndReason.ADMIN_REASSIGNMENT,
];

@Injectable()
export class StewardshipRelationshipsService {
  constructor(
    @Inject(STEWARDSHIP_RELATIONSHIP_REPOSITORY) private readonly repo: IStewardshipRelationshipRepository,
    @Inject(STEWARD_CAPACITY_REPOSITORY) private readonly capacityRepo: IStewardCapacityRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgRepo: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY) private readonly orgMemberRepo: IOrganizationMemberRepository,
    @Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository,
    @Inject(JOURNEY_REPOSITORY) private readonly journeyRepo: IJourneyRepository,
    @Inject(MILESTONE_REPOSITORY) private readonly milestoneRepo: IMilestoneRepository,
    @Inject(TASK_REPOSITORY) private readonly taskRepo: ITaskRepository,
    private readonly profileService: ProfileService,
  ) {}

  // ── Creation flows ────────────────────────────────────────────────────

  /** A member requests a steward. Always lands PENDING — a request never self-activates. */
  async requestSteward(dto: RequestStewardDto, caller: AuthenticatedUser): Promise<RelationshipResponseDto> {
    if (dto.preferredStewardId) {
      await this.assertHoldsStewardRole(dto.preferredStewardId);
    }
    const created = await this.repo.create({
      memberId: caller.id,
      stewardId: dto.preferredStewardId,
      origin: StewardshipRelationshipOrigin.MEMBER_REQUEST,
      status: StewardshipRelationshipStatus.PENDING,
      requestedById: caller.id,
    });
    return RelationshipResponseDto.fromEntity(created);
  }

  /**
   * AI recommends a steward for a member. Always lands PENDING — the
   * canonical product decision is that AI may recommend but never
   * automatically assign; only a human confirmation (activate) can make it
   * ACTIVE.
   */
  async recommendSteward(dto: RecommendStewardDto, caller: AuthenticatedUser): Promise<RelationshipResponseDto> {
    if (!hasRole(caller, [UserRole.AI_SERVICE_ACCOUNT])) {
      throw new ForbiddenException('Only an AI service account may recommend a steward');
    }
    await this.assertHoldsStewardRole(dto.stewardId);

    const created = await this.repo.create({
      memberId: dto.memberId,
      stewardId: dto.stewardId,
      origin: StewardshipRelationshipOrigin.AI_RECOMMENDATION,
      status: StewardshipRelationshipStatus.PENDING,
      recommendedById: caller.id,
    });
    return RelationshipResponseDto.fromEntity(created);
  }

  /** An organization ADMIN representative assigns a steward, effective immediately. */
  async assignByOrganization(
    dto: OrganizationAssignStewardDto, caller: AuthenticatedUser,
  ): Promise<RelationshipResponseDto> {
    await this.assertOrgAdmin(dto.organizationId, caller);
    await this.assertHoldsStewardRole(dto.stewardId);
    await this.assertCapacityAvailable(dto.stewardId);

    const now = new Date();
    const created = await this.repo.create({
      memberId: dto.memberId,
      stewardId: dto.stewardId,
      origin: StewardshipRelationshipOrigin.ORGANIZATION_ASSIGNMENT,
      status: StewardshipRelationshipStatus.ACTIVE,
      assignedById: caller.id,
      assignedByOrganizationId: dto.organizationId,
      activatedAt: now,
    });
    return RelationshipResponseDto.fromEntity(created);
  }

  /** A Platform/System Administrator assigns a steward, effective immediately. */
  async assignByAdmin(dto: AdminAssignStewardDto, caller: AuthenticatedUser): Promise<RelationshipResponseDto> {
    this.assertPlatformAdmin(caller);
    await this.assertHoldsStewardRole(dto.stewardId);
    await this.assertCapacityAvailable(dto.stewardId);

    const now = new Date();
    const created = await this.repo.create({
      memberId: dto.memberId,
      stewardId: dto.stewardId,
      origin: StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT,
      status: StewardshipRelationshipStatus.ACTIVE,
      assignedById: caller.id,
      activatedAt: now,
    });
    return RelationshipResponseDto.fromEntity(created);
  }

  // ── Read ──────────────────────────────────────────────────────────────

  async findById(id: string, caller: AuthenticatedUser): Promise<RelationshipResponseDto> {
    const relationship = await this.getVisibleOrThrow(id, caller);
    return RelationshipResponseDto.fromEntity(relationship);
  }

  async findAll(query: ListRelationshipsQueryDto, caller: AuthenticatedUser): Promise<PaginatedRelationshipsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const isAdmin = hasRole(caller, PLATFORM_ADMIN_ROLES);

    const { memberId, stewardId } = query;
    if (!isAdmin) {
      if (!memberId && !stewardId) {
        throw new ForbiddenException('You must filter by your own memberId or stewardId to list relationships');
      }
      if (memberId && memberId !== caller.id) {
        throw new ForbiddenException('You may only list your own relationships');
      }
      if (stewardId && stewardId !== caller.id) {
        throw new ForbiddenException('You may only list your own relationships');
      }
    }

    const result = await this.repo.findAll({ page, limit, memberId, stewardId, status: query.status });
    return {
      data: result.data.map(RelationshipResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  /** A steward's read-only view of an assigned member's plan (PA-012 Steward Authority). */
  async getMemberOverview(id: string, caller: AuthenticatedUser): Promise<MemberOverviewResponseDto> {
    const relationship = await this.repo.findById(id);
    if (!relationship) throw new NotFoundException(`Stewardship relationship '${id}' not found`);

    const isAdmin = hasRole(caller, PLATFORM_ADMIN_ROLES);
    if (!isAdmin && relationship.stewardId !== caller.id) {
      throw new ForbiddenException('Only the assigned steward may view this member overview');
    }

    const memberId = relationship.memberId;

    let profile = null;
    try {
      profile = await this.profileService.findByUserId(memberId);
    } catch {
      profile = null;
    }

    const goalsResult = await this.goalRepo.findAll({ page: 1, limit: 100, userId: memberId });
    const goals = goalsResult.data;

    const journeys = (
      await Promise.all(goals.map((g) => this.journeyRepo.findByGoalId(g.id)))
    ).filter((j): j is NonNullable<typeof j> => j !== null);

    const milestonesByJourney = await Promise.all(
      journeys.map((j) => this.milestoneRepo.findAll({ page: 1, limit: 100, journeyId: j.id })),
    );
    const milestones = milestonesByJourney.flatMap((r) => r.data);

    const tasksByMilestone = await Promise.all(
      milestones.map((m) => this.taskRepo.findAll({ page: 1, limit: 100, milestoneId: m.id })),
    );
    const tasks = tasksByMilestone.flatMap((r) => r.data);

    return {
      profile,
      goals: goals.map(GoalResponseDto.fromEntity),
      journeys: journeys.map(JourneyResponseDto.fromEntity),
      milestones: milestones.map(MilestoneResponseDto.fromEntity),
      tasks: tasks.map(TaskResponseDto.fromEntity),
    };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  async activate(id: string, dto: ActivateRelationshipDto, caller: AuthenticatedUser): Promise<RelationshipResponseDto> {
    const relationship = await this.repo.findById(id);
    if (!relationship) throw new NotFoundException(`Stewardship relationship '${id}' not found`);
    if (relationship.status !== StewardshipRelationshipStatus.PENDING) {
      throw new ConflictException(`Relationship is in '${relationship.status}' status. Only PENDING relationships can be activated.`);
    }

    const stewardId = dto.stewardId ?? relationship.stewardId;
    if (!stewardId) {
      throw new BadRequestException('A stewardId must be specified to activate this relationship');
    }
    await this.assertHoldsStewardRole(stewardId);
    await this.assertCapacityAvailable(stewardId);

    let assignedByOrganizationId: string | undefined;
    if (dto.organizationId) {
      await this.assertOrgAdmin(dto.organizationId, caller);
      assignedByOrganizationId = dto.organizationId;
    } else {
      this.assertPlatformAdmin(caller);
    }

    const updated = await this.repo.update(id, {
      stewardId,
      status: StewardshipRelationshipStatus.ACTIVE,
      assignedById: caller.id,
      assignedByOrganizationId,
      activatedAt: new Date(),
    });
    return RelationshipResponseDto.fromEntity(updated);
  }

  async end(id: string, dto: EndRelationshipDto, caller: AuthenticatedUser): Promise<RelationshipResponseDto> {
    const relationship = await this.repo.findById(id);
    if (!relationship) throw new NotFoundException(`Stewardship relationship '${id}' not found`);
    if (relationship.status === StewardshipRelationshipStatus.ENDED) {
      throw new ConflictException('This relationship has already ended');
    }

    await this.assertCanEnd(relationship, dto.reason, dto.organizationId, caller);

    const updated = await this.repo.update(id, {
      status: StewardshipRelationshipStatus.ENDED,
      endReason: dto.reason,
      endedById: caller.id,
      endedAt: new Date(),
    });
    return RelationshipResponseDto.fromEntity(updated);
  }

  /** Ends the current relationship and immediately creates+activates a new one with the new steward. */
  async reassign(id: string, dto: ReassignRelationshipDto, caller: AuthenticatedUser): Promise<RelationshipResponseDto> {
    if (!REASSIGNMENT_REASONS.includes(dto.reason)) {
      throw new BadRequestException('reassign only accepts ORGANIZATION_REASSIGNMENT or ADMIN_REASSIGNMENT');
    }

    const current = await this.end(id, { reason: dto.reason, organizationId: dto.organizationId }, caller);

    if (dto.reason === StewardshipEndReason.ORGANIZATION_REASSIGNMENT) {
      if (!dto.organizationId) throw new BadRequestException('organizationId is required for ORGANIZATION_REASSIGNMENT');
      return this.assignByOrganization(
        { memberId: current.memberId, stewardId: dto.newStewardId, organizationId: dto.organizationId },
        caller,
      );
    }
    return this.assignByAdmin({ memberId: current.memberId, stewardId: dto.newStewardId }, caller);
  }

  // ── Authorization helpers ────────────────────────────────────────────

  private assertPlatformAdmin(caller: AuthenticatedUser): void {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform/System Administrator may perform this action');
    }
  }

  private async assertOrgAdmin(organizationId: string, caller: AuthenticatedUser): Promise<void> {
    const org = await this.orgRepo.findById(organizationId);
    if (!org) throw new NotFoundException(`Organization '${organizationId}' not found`);
    if (org.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Only a verified organization may assign stewards');
    }
    const membership = await this.orgMemberRepo.findByOrgAndUser(organizationId, caller.id);
    if (!membership || membership.role !== OrganizationMemberRole.ADMIN) {
      throw new ForbiddenException('You must be an ADMIN representative of this organization');
    }
  }

  private async assertHoldsStewardRole(stewardId: string): Promise<void> {
    const user = await this.userRepo.findById(stewardId);
    if (!user) throw new NotFoundException(`User '${stewardId}' not found`);
    if (!user.roles.includes(UserRole.STEWARD)) {
      throw new BadRequestException(`User '${stewardId}' does not hold the STEWARD role`);
    }
  }

  private async assertCapacityAvailable(stewardId: string): Promise<void> {
    const capacity = await this.capacityRepo.findOrCreate(stewardId, stewardId);
    const activeCount = await this.repo.countActiveByStewardId(stewardId);
    if (activeCount >= capacity.maxActiveMembers) {
      throw new ConflictException(
        `Steward '${stewardId}' is at capacity (${activeCount}/${capacity.maxActiveMembers} active members)`,
      );
    }
  }

  private async assertCanEnd(
    relationship: StewardshipRelationship,
    reason: StewardshipEndReason,
    organizationId: string | undefined,
    caller: AuthenticatedUser,
  ): Promise<void> {
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;

    switch (reason) {
      case StewardshipEndReason.MEMBER_REQUEST:
        if (caller.id === relationship.memberId) return;
        break;
      case StewardshipEndReason.STEWARD_RESIGNATION:
        if (caller.id === relationship.stewardId) return;
        break;
      case StewardshipEndReason.ORGANIZATION_REASSIGNMENT:
        if (organizationId) {
          await this.assertOrgAdmin(organizationId, caller);
          return;
        }
        break;
      case StewardshipEndReason.ADMIN_REASSIGNMENT:
      case StewardshipEndReason.STEWARD_INACTIVITY:
        break; // admin-only, already excluded above
      default:
        break;
    }
    throw new ForbiddenException('You do not have permission to end this relationship for the given reason');
  }

  private async getVisibleOrThrow(id: string, caller: AuthenticatedUser): Promise<StewardshipRelationship> {
    const relationship = await this.repo.findById(id);
    if (!relationship) throw new NotFoundException(`Stewardship relationship '${id}' not found`);

    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return relationship;
    if (caller.id === relationship.memberId || caller.id === relationship.stewardId) return relationship;
    if (relationship.assignedByOrganizationId) {
      const membership = await this.orgMemberRepo.findByOrgAndUser(relationship.assignedByOrganizationId, caller.id);
      if (membership?.role === OrganizationMemberRole.ADMIN) return relationship;
    }

    throw new ForbiddenException('You do not have permission to view this relationship');
  }
}
