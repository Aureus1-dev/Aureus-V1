import {
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
import { PLATFORM_ADMIN_ROLES } from '../common/stewardship-roles.util';
import {
  IStewardshipEscalationRepository,
  STEWARDSHIP_ESCALATION_REPOSITORY,
} from '../escalations/repositories/stewardship-escalation.repository.interface';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../relationships/repositories/stewardship-relationship.repository.interface';
import { StewardshipRelationshipsService } from '../relationships/stewardship-relationships.service';
import {
  AssignHumanStewardDto,
  HumanStewardOwnershipState,
  HumanStewardQueueItemDto,
  PeopleTriageLevel,
  PeopleTriageSource,
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
    private readonly relationshipService: StewardshipRelationshipsService,
  ) {}

  async queue(caller: AuthenticatedUser): Promise<HumanStewardQueueItemDto[]> {
    this.assertHumanOperator(caller);

    if (this.isAdmin(caller)) {
      const rows = await this.needEscalations.findOpen();
      return Promise.all(rows.map((row) => this.project(row)));
    }

    const assigned = await this.relationships.findAll({
      page: 1,
      limit: 1000,
      stewardId: caller.id,
      status: StewardshipRelationshipStatus.ACTIVE,
    });
    const memberIds = [...new Set(assigned.data.map((relationship) => relationship.memberId))];
    const rows = await this.needEscalations.findOpenByUserIds(memberIds);
    return Promise.all(rows.map((row) => this.project(row)));
  }

  async findOne(escalationId: string, caller: AuthenticatedUser): Promise<HumanStewardQueueItemDto> {
    const escalation = await this.getAuthorizedEscalationOrThrow(escalationId, caller);
    return this.project(escalation);
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
    if (current?.stewardId === dto.stewardId) {
      return this.project(escalation);
    }

    if (current) {
      await this.relationshipService.reassign(
        current.id,
        {
          newStewardId: dto.stewardId,
          reason: StewardshipEndReason.ADMIN_REASSIGNMENT,
        },
        caller,
      );
      await this.closeHandoffRequests(current.id, escalationId);
    } else {
      await this.relationshipService.assignByAdmin(
        { memberId: escalation.userId, stewardId: dto.stewardId },
        caller,
      );
    }

    return this.project(await this.getEscalationOrThrow(escalationId));
  }

  async acknowledge(escalationId: string, caller: AuthenticatedUser): Promise<HumanStewardQueueItemDto> {
    const escalation = await this.getAuthorizedOpenEscalationOrThrow(escalationId, caller);
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
    const escalation = await this.getAuthorizedOpenEscalationOrThrow(escalationId, caller);
    const item = await this.project(escalation);
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
    const escalation = await this.getAuthorizedOpenEscalationOrThrow(escalationId, caller);
    const item = await this.project(escalation);
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

    return this.project(await this.getEscalationOrThrow(escalationId));
  }

  async resolve(
    escalationId: string,
    dto: ResolveHumanStewardRequestDto,
    caller: AuthenticatedUser,
  ): Promise<HumanStewardQueueItemDto> {
    const escalation = await this.getAuthorizedOpenEscalationOrThrow(escalationId, caller);
    await this.needEscalations.resolve(
      escalation.id,
      caller.id,
      dto.resolutionNotes ? sanitizePlainText(dto.resolutionNotes) : undefined,
    );
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

    const triage = relationship ? await this.findCurrentTriage(relationship.id, escalation.id) : null;
    const crisisSignal = Boolean(need && isCrisisLanguage(need.content));
    const triageLevel = triage?.level ?? (crisisSignal ? PeopleTriageLevel.T3_IMMEDIATE_SAFETY : null);
    const triageSource = triage
      ? PeopleTriageSource.HUMAN_RECORDED
      : crisisSignal
        ? PeopleTriageSource.SYSTEM_CRISIS_SIGNAL
        : null;
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
      triageSource,
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
      limit: 2,
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

  private async getAuthorizedEscalationOrThrow(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<NeedEscalation> {
    this.assertHumanOperator(caller);
    const escalation = await this.getEscalationOrThrow(id);
    if (this.isAdmin(caller)) return escalation;

    const active = await this.getActiveRelationships(escalation.userId);
    if (active.length === 1 && active[0].stewardId === caller.id) {
      return escalation;
    }
    throw new NotFoundException('Human Steward request not found');
  }

  private async getAuthorizedOpenEscalationOrThrow(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<NeedEscalation> {
    const escalation = await this.getAuthorizedEscalationOrThrow(id, caller);
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

  private isAdmin(caller: AuthenticatedUser): boolean {
    return hasRole(caller, PLATFORM_ADMIN_ROLES);
  }
}
