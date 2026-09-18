import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NeedEscalation,
  NeedEscalationStatus,
  Responsibility,
  ResponsibilityKind,
  ResponsibilityStatus,
  StewardshipEndReason,
  StewardshipEscalation,
  StewardshipEscalationSeverity,
  StewardshipEscalationStatus,
  StewardshipRelationship,
  StewardshipRelationshipStatus,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { sanitizePlainText } from '../../common/utils/sanitize-text';
import { isCrisisLanguage } from '../../needs/crisis-detection.util';
import {
  IStatedNeedEscalationRepository,
  NEED_ESCALATION_REPOSITORY,
} from '../../needs/repositories/need-escalation.repository.interface';
import {
  IStatedNeedRepository,
  STATED_NEED_REPOSITORY,
} from '../../needs/repositories/stated-need.repository.interface';
import {
  IResponsibilityRepository,
  RESPONSIBILITY_REPOSITORY,
} from '../../responsibilities/repositories/responsibility.repository.interface';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../relationships/repositories/stewardship-relationship.repository.interface';
import { StewardshipRelationshipsService } from '../relationships/stewardship-relationships.service';
import {
  IStewardshipEscalationRepository,
  STEWARDSHIP_ESCALATION_REPOSITORY,
} from '../escalations/repositories/stewardship-escalation.repository.interface';
import { StewardCapacityService } from '../capacity/steward-capacity.service';
import { PLATFORM_ADMIN_ROLES } from '../common/stewardship-roles.util';
import { IUserRepository, USER_REPOSITORY } from '../../users/repositories/user.repository.interface';
import {
  AssignHumanStewardDto,
  HumanStewardOwnershipState,
  HumanStewardQueueItemDto,
  PeopleTriageLevel,
  RequestHumanStewardHandoffDto,
  ResolveHumanStewardRequestDto,
  ResponsibilityLinkState,
  TriageHumanStewardRequestDto,
} from './human-steward-operations.dto';

const TERMINAL_RESPONSIBILITY_STATUSES = new Set<ResponsibilityStatus>([
  ResponsibilityStatus.COMPLETED,
  ResponsibilityStatus.RESPONSIBLY_EXHAUSTED,
  ResponsibilityStatus.CANCELLED,
]);

const TRIAGE_PREFIX = 'PEOPLE_STEP4_TRIAGE:';
const HANDOFF_PREFIX = 'PEOPLE_STEP4_HANDOFF:';

const TRIAGE_SEVERITY: Record<PeopleTriageLevel, StewardshipEscalationSeverity> = {
  [PeopleTriageLevel.T0_EXPLORE]: StewardshipEscalationSeverity.LOW,
  [PeopleTriageLevel.T1_IMPORTANT]: StewardshipEscalationSeverity.MEDIUM,
  [PeopleTriageLevel.T2_FOUNDATION_RISK]: StewardshipEscalationSeverity.HIGH,
  [PeopleTriageLevel.T3_IMMEDIATE_SAFETY]: StewardshipEscalationSeverity.CRITICAL,
};

@Injectable()
export class HumanStewardOperationsService {
  constructor(
    @Inject(NEED_ESCALATION_REPOSITORY)
    private readonly needEscalations: IStatedNeedEscalationRepository,
    @Inject(STATED_NEED_REPOSITORY)
    private readonly statedNeeds: IStatedNeedRepository,
    @Inject(RESPONSIBILITY_REPOSITORY)
    private readonly responsibilities: IResponsibilityRepository,
    @Inject(STEWARDSHIP_RELATIONSHIP_REPOSITORY)
    private readonly relationships: IStewardshipRelationshipRepository,
    @Inject(STEWARDSHIP_ESCALATION_REPOSITORY)
    private readonly oversight: IStewardshipEscalationRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    private readonly relationshipService: StewardshipRelationshipsService,
    private readonly capacityService: StewardCapacityService,
  ) {}

  async queue(caller: AuthenticatedUser): Promise<HumanStewardQueueItemDto[]> {
    this.assertHumanOperator(caller);
    const rows = await this.needEscalations.findOpen();
    const projected = await Promise.all(rows.map((row) => this.project(row)));

    if (this.isAdmin(caller)) return projected;
    return projected.filter(
      (item) =>
        item.ownershipState === HumanStewardOwnershipState.ASSIGNED &&
        item.assignedStewardId === caller.id,
    );
  }

  async findOne(escalationId: string, caller: AuthenticatedUser): Promise<HumanStewardQueueItemDto> {
    this.assertHumanOperator(caller);
    const escalation = await this.getEscalationOrThrow(escalationId);
    const item = await this.project(escalation);
    this.assertQueueVisibility(item, caller);
    return item;
  }

  async assign(
    escalationId: string,
    dto: AssignHumanStewardDto,
    caller: AuthenticatedUser,
  ): Promise<HumanStewardQueueItemDto> {
    this.assertAdmin(caller);
    const escalation = await this.getOpenEscalationOrThrow(escalationId);
    const active = await this.getActiveRelationships(escalation.userId);
    if (active.length > 1) {
      throw new ConflictException('Member has multiple ACTIVE Stewardship relationships; resolve ownership conflict before assignment');
    }

    const current = active[0] ?? null;
    if (current?.stewardId !== dto.stewardId) {
      await this.preflightAssignmentTarget(dto.stewardId, caller);
    }

    let nextRelationship: { id: string; stewardId: string | null };
    if (!current) {
      nextRelationship = await this.relationshipService.assignByAdmin(
        { memberId: escalation.userId, stewardId: dto.stewardId },
        caller,
      );
    } else if (current.stewardId === dto.stewardId) {
      nextRelationship = current;
    } else {
      nextRelationship = await this.relationshipService.reassign(
        current.id,
        {
          newStewardId: dto.stewardId,
          reason: StewardshipEndReason.ADMIN_REASSIGNMENT,
        },
        caller,
      );
      await this.closeHandoffRequests(current.id, escalationId);
    }

    if (nextRelationship.stewardId !== dto.stewardId) {
      throw new ConflictException('Steward assignment did not produce the requested current owner');
    }
    return this.project(await this.getEscalationOrThrow(escalationId));
  }

  async acknowledge(escalationId: string, caller: AuthenticatedUser): Promise<HumanStewardQueueItemDto> {
    const escalation = await this.getOpenEscalationOrThrow(escalationId);
    const item = await this.project(escalation);
    this.assertAssignedOperator(item, caller);

    if (escalation.status === NeedEscalationStatus.PENDING) {
      await this.needEscalations.acknowledge(escalation.id, caller.id);
    }
    return this.project(await this.getEscalationOrThrow(escalationId));
  }

  async triage(
    escalationId: string,
    dto: TriageHumanStewardRequestDto,
    caller: AuthenticatedUser,
  ): Promise<HumanStewardQueueItemDto> {
    const escalation = await this.getOpenEscalationOrThrow(escalationId);
    const item = await this.project(escalation);
    this.assertAssignedOperator(item, caller);
    if (!item.relationshipId) {
      throw new ConflictException('Assign a Human Steward before recording relationship-scoped triage');
    }

    const existing = await this.oversight.findByRelationship(item.relationshipId);
    const prefix = `${TRIAGE_PREFIX}${escalationId}:`;
    await Promise.all(
      existing
        .filter(
          (record) =>
            record.title.startsWith(prefix) &&
            (record.status === StewardshipEscalationStatus.OPEN ||
              record.status === StewardshipEscalationStatus.IN_PROGRESS),
        )
        .map((record) => this.oversight.update(record.id, { status: StewardshipEscalationStatus.CLOSED })),
    );

    const created = await this.oversight.create({
      relationshipId: item.relationshipId,
      title: `${prefix}${dto.level}`,
      description: sanitizePlainText(dto.reason),
      severity: TRIAGE_SEVERITY[dto.level],
      raisedById: caller.id,
    });

    // T0/T1 are attributable triage history, not unresolved supervisory alarms.
    // T2/T3 stay open so the existing oversight dashboard can surface them.
    if (dto.level === PeopleTriageLevel.T0_EXPLORE || dto.level === PeopleTriageLevel.T1_IMPORTANT) {
      await this.oversight.update(created.id, {
        status: StewardshipEscalationStatus.CLOSED,
      });
    }

    return this.project(await this.getEscalationOrThrow(escalationId));
  }

  async requestHandoff(
    escalationId: string,
    dto: RequestHumanStewardHandoffDto,
    caller: AuthenticatedUser,
  ): Promise<HumanStewardQueueItemDto> {
    const escalation = await this.getOpenEscalationOrThrow(escalationId);
    const item = await this.project(escalation);
    this.assertAssignedOperator(item, caller);
    if (!item.relationshipId) {
      throw new ConflictException('An active Human Steward relationship is required before requesting handoff');
    }

    await this.oversight.create({
      relationshipId: item.relationshipId,
      title: `${HANDOFF_PREFIX}${escalationId}:${new Date().toISOString()}`,
      description: sanitizePlainText(dto.reason),
      severity: StewardshipEscalationSeverity.HIGH,
      raisedById: caller.id,
    });

    // Deliberately do not end or alter the relationship here. The current
    // steward remains the owner until an administrator successfully reassigns.
    return this.project(await this.getEscalationOrThrow(escalationId));
  }

  async resolve(
    escalationId: string,
    dto: ResolveHumanStewardRequestDto,
    caller: AuthenticatedUser,
  ): Promise<HumanStewardQueueItemDto> {
    const escalation = await this.getOpenEscalationOrThrow(escalationId);
    const item = await this.project(escalation);
    this.assertAssignedOperator(item, caller);

    await this.needEscalations.resolve(
      escalation.id,
      caller.id,
      dto.resolutionNotes ? sanitizePlainText(dto.resolutionNotes) : undefined,
    );

    // This only resolves the Human Steward step. People Step 1 remains the
    // authority for source-domain outcome evidence and Responsibility closure.
    return this.project(await this.getEscalationOrThrow(escalationId));
  }

  private async project(escalation: NeedEscalation): Promise<HumanStewardQueueItemDto> {
    const [activeRelationships, responsibilityLink, need] = await Promise.all([
      this.getActiveRelationships(escalation.userId),
      this.resolveResponsibilityLink(escalation.userId, escalation.statedNeedId),
      this.statedNeeds.findById(escalation.statedNeedId),
    ]);

    let ownershipState: HumanStewardOwnershipState;
    let relationship: StewardshipRelationship | null = null;
    if (activeRelationships.length === 0) {
      ownershipState = HumanStewardOwnershipState.UNASSIGNED;
    } else if (activeRelationships.length === 1) {
      ownershipState = HumanStewardOwnershipState.ASSIGNED;
      relationship = activeRelationships[0];
    } else {
      ownershipState = HumanStewardOwnershipState.CONFLICT;
    }

    const triage = relationship
      ? await this.findCurrentTriage(relationship.id, escalation.id)
      : null;

    const crisisSignal = Boolean(need && isCrisisLanguage(need.content));
    const triageLevel = triage?.level ?? (crisisSignal ? PeopleTriageLevel.T3_IMMEDIATE_SAFETY : null);
    const triageSeverity = triage?.severity ?? (crisisSignal ? StewardshipEscalationSeverity.CRITICAL : null);
    const triageReason = triage?.reason ?? (
      crisisSignal
        ? 'Deterministic crisis-language signal from the source need. Private source text is not exposed in the Human Steward queue.'
        : null
    );

    return {
      escalationId: escalation.id,
      memberId: escalation.userId,
      statedNeedId: escalation.statedNeedId,
      status: escalation.status,
      reason: escalation.reason,
      responsibilityLinkState: responsibilityLink.state,
      responsibilityId: responsibilityLink.id,
      ownershipState,
      relationshipId: relationship?.id ?? null,
      assignedStewardId: relationship?.stewardId ?? null,
      triageLevel,
      triageReason,
      triageSeverity,
      triagedAt: triage?.createdAt ?? null,
      acknowledgedById: escalation.acknowledgedById,
      acknowledgedAt: escalation.acknowledgedAt,
      createdAt: escalation.createdAt,
      authorityBoundary: 'ASSIGNMENT_DOES_NOT_GRANT_PRIVATE_DATA_OR_ACTION_AUTHORITY',
    };
  }

  private async getActiveRelationships(memberId: string): Promise<StewardshipRelationship[]> {
    const result = await this.relationships.findAll({
      page: 1,
      limit: 10,
      memberId,
      status: StewardshipRelationshipStatus.ACTIVE,
    });
    return result.data;
  }

  private async resolveResponsibilityLink(
    memberId: string,
    statedNeedId: string,
  ): Promise<{ state: ResponsibilityLinkState; id: string | null }> {
    const rows = await this.responsibilities.findPersonalByUser(memberId);
    const linked = rows.filter(
      (responsibility) =>
        responsibility.kind === ResponsibilityKind.PERSONAL_NEED_RESOLUTION &&
        this.criteriaStatedNeedId(responsibility) === statedNeedId,
    );
    const open = linked.filter((responsibility) => !TERMINAL_RESPONSIBILITY_STATUSES.has(responsibility.status));
    const candidates = open.length > 0 ? open : linked;

    if (candidates.length === 0) return { state: ResponsibilityLinkState.MISSING, id: null };
    if (candidates.length > 1) return { state: ResponsibilityLinkState.AMBIGUOUS, id: null };
    return { state: ResponsibilityLinkState.LINKED, id: candidates[0].id };
  }

  private criteriaStatedNeedId(responsibility: Responsibility): string | null {
    const criteria = responsibility.successCriteria;
    if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) return null;
    const record = criteria as Record<string, unknown>;
    return record.type === 'PERSONAL_NEED_RESOLUTION' && typeof record.statedNeedId === 'string'
      ? record.statedNeedId
      : null;
  }

  private async findCurrentTriage(
    relationshipId: string,
    needEscalationId: string,
  ): Promise<{
    level: PeopleTriageLevel;
    reason: string;
    severity: StewardshipEscalationSeverity;
    createdAt: Date;
  } | null> {
    const rows = await this.oversight.findByRelationship(relationshipId);
    const prefix = `${TRIAGE_PREFIX}${needEscalationId}:`;
    const matching = rows
      .filter((row) => row.title.startsWith(prefix))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const latest = matching[0];
    if (!latest) return null;

    const rawLevel = latest.title.slice(prefix.length);
    if (!Object.values(PeopleTriageLevel).includes(rawLevel as PeopleTriageLevel)) return null;
    return {
      level: rawLevel as PeopleTriageLevel,
      reason: latest.description,
      severity: latest.severity,
      createdAt: latest.createdAt,
    };
  }

  private async closeHandoffRequests(relationshipId: string, escalationId: string): Promise<void> {
    const rows = await this.oversight.findByRelationship(relationshipId);
    const prefix = `${HANDOFF_PREFIX}${escalationId}:`;
    await Promise.all(
      rows
        .filter(
          (row) =>
            row.title.startsWith(prefix) &&
            (row.status === StewardshipEscalationStatus.OPEN || row.status === StewardshipEscalationStatus.IN_PROGRESS),
        )
        .map((row) =>
          this.oversight.update(row.id, {
            status: StewardshipEscalationStatus.CLOSED,
          }),
        ),
    );
  }

  private async preflightAssignmentTarget(stewardId: string, caller: AuthenticatedUser): Promise<void> {
    const user = await this.users.findById(stewardId);
    if (!user) throw new NotFoundException(`User '${stewardId}' not found`);
    if (!user.roles.includes(UserRole.STEWARD)) {
      throw new BadRequestException(`User '${stewardId}' does not hold the STEWARD role`);
    }

    const [capacity, activeCount] = await Promise.all([
      this.capacityService.findByStewardId(stewardId, caller),
      this.relationships.countActiveByStewardId(stewardId),
    ]);
    if (activeCount >= capacity.maxActiveMembers) {
      throw new ConflictException(
        `Steward '${stewardId}' is at capacity (${activeCount}/${capacity.maxActiveMembers} active members)`,
      );
    }
  }

  private async getEscalationOrThrow(id: string): Promise<NeedEscalation> {
    const escalation = await this.needEscalations.findById(id);
    if (!escalation) throw new NotFoundException('Human Steward request not found');
    return escalation;
  }

  private async getOpenEscalationOrThrow(id: string): Promise<NeedEscalation> {
    const escalation = await this.getEscalationOrThrow(id);
    if (escalation.status === NeedEscalationStatus.RESOLVED) {
      throw new ConflictException('Human Steward request has already been resolved');
    }
    return escalation;
  }

  private assertHumanOperator(caller: AuthenticatedUser): void {
    if (this.isAdmin(caller) || hasRole(caller, [UserRole.STEWARD])) return;
    throw new ForbiddenException('Only a Human Steward or Platform/System Administrator may access steward operations');
  }

  private assertAdmin(caller: AuthenticatedUser): void {
    if (!this.isAdmin(caller)) {
      throw new ForbiddenException('Only a Platform/System Administrator may assign or reassign Human Stewards');
    }
  }

  private assertQueueVisibility(item: HumanStewardQueueItemDto, caller: AuthenticatedUser): void {
    if (this.isAdmin(caller)) return;
    if (
      item.ownershipState === HumanStewardOwnershipState.ASSIGNED &&
      item.assignedStewardId === caller.id
    ) return;
    // Opaque boundary: unrelated stewards should not learn whether another
    // member has an open Human Steward request.
    throw new NotFoundException('Human Steward request not found');
  }

  private assertAssignedOperator(item: HumanStewardQueueItemDto, caller: AuthenticatedUser): void {
    this.assertHumanOperator(caller);
    if (this.isAdmin(caller)) return;
    if (
      item.ownershipState === HumanStewardOwnershipState.ASSIGNED &&
      item.assignedStewardId === caller.id
    ) return;
    throw new NotFoundException('Human Steward request not found');
  }

  private isAdmin(caller: AuthenticatedUser): boolean {
    return hasRole(caller, PLATFORM_ADMIN_ROLES);
  }
}
