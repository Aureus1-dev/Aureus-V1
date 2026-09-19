import { randomUUID } from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CitySheetCategory,
  NotificationCategory,
  Prisma,
  ResponsibilityActorClass,
  ResponsibilityEvidenceLevel,
  ResponsibilityEventType,
  ResponsibilityKind,
  ResponsibilityStatus,
  StewardshipRelationship,
  StewardshipRelationshipStatus,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { hasRole } from '../auth/utils/has-role.util';
import { sanitizePlainText } from '../common/utils/sanitize-text';
import { NotificationsService } from '../communication/notifications/notifications.service';
import { matchCategoriesForNeed } from '../needs/resource-matching.util';
import {
  IStatedNeedRepository,
  STATED_NEED_REPOSITORY,
} from '../needs/repositories/stated-need.repository.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ResponsibilitiesService } from '../responsibilities/responsibilities.service';
import { PLATFORM_ADMIN_ROLES } from '../stewardship/common/stewardship-roles.util';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../stewardship/relationships/repositories/stewardship-relationship.repository.interface';
import {
  AssignedFollowThroughResponseDto,
  CreateHousingFollowThroughDto,
  PeopleFollowThroughAttemptResult,
  PeopleFollowThroughDueProvenance,
  PeopleFollowThroughKind,
  PeopleFollowThroughOwner,
  PeopleFollowThroughResponseDto,
  PeopleFollowThroughState,
  RecordFollowThroughAttemptDto,
  ReportFollowThroughDueChangeDto,
  ReportFollowThroughSatisfactionDto,
  VerifyFollowThroughDueDto,
  VerifyFollowThroughSatisfactionDto,
} from './people-follow-through.dto';

const STEP5_VERSION = 'people-step5-obligation-v1';
const OPEN_RESPONSIBILITY_STATUSES: ResponsibilityStatus[] = [
  ResponsibilityStatus.ACTIVE,
  ResponsibilityStatus.WAITING_ON_AUREUS,
  ResponsibilityStatus.WAITING_ON_USER,
  ResponsibilityStatus.WAITING_ON_THIRD_PARTY,
  ResponsibilityStatus.BLOCKED,
];
const TERMINAL_RESPONSIBILITY_STATUSES: ResponsibilityStatus[] = [
  ResponsibilityStatus.COMPLETED,
  ResponsibilityStatus.RESPONSIBLY_EXHAUSTED,
  ResponsibilityStatus.CANCELLED,
];
const SATISFIED_STATES = new Set<PeopleFollowThroughState>([
  PeopleFollowThroughState.SATISFIED_REPORTED,
  PeopleFollowThroughState.SATISFIED_VERIFIED,
]);

type CriteriaRecord = Record<string, unknown>;

interface EvidencePointer {
  sourceSystem: string;
  sourceRecordType: string;
  sourceRecordId: string;
  sourceState: string;
  evidenceLevel: 'REPORTED' | 'VERIFIED';
}

interface FollowThroughHistoryEntry {
  event: string;
  knownAt: string;
  actor: 'MEMBER' | 'AUREUS' | 'SYSTEM';
  actorUserId?: string;
  dueAt?: string;
  previousDueAt?: string;
  proposedDueAt?: string;
  dueProvenance?: PeopleFollowThroughDueProvenance;
  result?: PeopleFollowThroughAttemptResult;
  note?: string;
  source?: EvidencePointer;
}

interface FollowThroughContract {
  version: typeof STEP5_VERSION;
  obligationId: string;
  revision: number;
  domain: 'HOUSING';
  source: EvidencePointer;
  kind: PeopleFollowThroughKind;
  owner: PeopleFollowThroughOwner;
  requiredAction: string;
  dueAt: string;
  dueTimeZone: string;
  dueProvenance: PeopleFollowThroughDueProvenance;
  dueBasis: string;
  consequenceIfMissed: string | null;
  authorityClass: string;
  completionEvidenceRequirement: string;
  state: PeopleFollowThroughState;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  reportedSatisfiedAt: string | null;
  verifiedSatisfiedAt: string | null;
  reviewRequired: boolean;
  reviewReason: string | null;
  history: FollowThroughHistoryEntry[];
}

@Injectable()
export class PeopleFollowThroughService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly responsibilities: ResponsibilitiesService,
    private readonly notifications: NotificationsService,
    @Inject(STATED_NEED_REPOSITORY)
    private readonly statedNeeds: IStatedNeedRepository,
    @Inject(STEWARDSHIP_RELATIONSHIP_REPOSITORY)
    private readonly relationships: IStewardshipRelationshipRepository,
  ) {}

  async createHousingObligation(
    responsibilityId: string,
    dto: CreateHousingFollowThroughDto,
    caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    const responsibility = await this.responsibilities.findOwnedPersonalNeedResolution(
      responsibilityId,
      caller,
    );
    this.assertOpenResponsibility(responsibility.status);

    const criteria = this.asRecord(responsibility.successCriteria);
    if (criteria.step5FollowThrough) {
      throw new ConflictException(
        'This first Step 5 proof already has its one sourced Obligation. Generalized multi-obligation persistence is intentionally deferred.',
      );
    }

    const statedNeedId = this.statedNeedId(criteria);
    const need = await this.statedNeeds.findById(statedNeedId);
    if (!need || need.userId !== caller.id) {
      throw new NotFoundException('Canonical stated need not found');
    }
    if (!matchCategoriesForNeed(need.content).includes(CitySheetCategory.HOUSING_UTILITIES)) {
      throw new ConflictException(
        'The first Step 5 proof is deliberately bounded to a canonical housing/utilities need.',
      );
    }

    if (dto.owner === PeopleFollowThroughOwner.HUMAN_STEWARD) {
      const relationship = await this.findActiveRelationship(caller.id);
      if (!relationship?.stewardId) {
        throw new ConflictException(
          'A Human Steward can own this step only when the member already has an active assigned StewardshipRelationship.',
        );
      }
    }

    this.assertValidTimeZone(dto.dueTimeZone);
    const now = new Date().toISOString();
    const dueAt = new Date(dto.dueAt).toISOString();
    const requiredAction = this.cleanRequired(dto.requiredAction, 'requiredAction');
    const dueTimeZone = this.cleanRequired(dto.dueTimeZone, 'dueTimeZone');
    const dueBasis = this.cleanRequired(
      dto.dueBasis ?? 'Member-reported follow-through requirement.',
      'dueBasis',
    );
    const completionEvidenceRequirement = this.cleanRequired(
      dto.completionEvidenceRequirement ??
        'Independent evidence that the required housing follow-through condition actually occurred.',
      'completionEvidenceRequirement',
    );

    const contract: FollowThroughContract = {
      version: STEP5_VERSION,
      obligationId: randomUUID(),
      revision: 1,
      domain: 'HOUSING',
      source: {
        sourceSystem: 'NEEDS',
        sourceRecordType: 'StatedNeed',
        sourceRecordId: need.id,
        sourceState: 'MEMBER_STATED_HOUSING_NEED',
        evidenceLevel: 'REPORTED',
      },
      kind: dto.kind,
      owner: dto.owner,
      requiredAction,
      dueAt,
      dueTimeZone,
      dueProvenance: PeopleFollowThroughDueProvenance.REPORTED,
      dueBasis,
      consequenceIfMissed: dto.consequenceIfMissed
        ? this.cleanRequired(dto.consequenceIfMissed, 'consequenceIfMissed')
        : null,
      authorityClass: responsibility.authorityClass,
      completionEvidenceRequirement,
      state: PeopleFollowThroughState.PENDING,
      attemptCount: 0,
      lastAttemptAt: null,
      nextAttemptAt: null,
      reportedSatisfiedAt: null,
      verifiedSatisfiedAt: null,
      reviewRequired: false,
      reviewReason: null,
      history: [
        {
          event: 'OBLIGATION_RECORDED',
          knownAt: now,
          actor: 'MEMBER',
          actorUserId: caller.id,
          dueAt,
          dueProvenance: PeopleFollowThroughDueProvenance.REPORTED,
          source: {
            sourceSystem: 'NEEDS',
            sourceRecordType: 'StatedNeed',
            sourceRecordId: need.id,
            sourceState: 'MEMBER_STATED_HOUSING_NEED',
            evidenceLevel: 'REPORTED',
          },
        },
      ],
    };

    await this.createContract(responsibilityId, caller.id, contract);
    await this.alignResponsibilityWaitingState(responsibilityId, dto.owner, caller);
    return this.toResponse(responsibilityId, contract);
  }

  async findMine(
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    const responsibility = await this.responsibilities.findOwnedPersonalNeedResolution(
      responsibilityId,
      caller,
    );
    return this.toResponse(
      responsibilityId,
      this.contractFromCriteria(responsibility.successCriteria),
    );
  }

  async recordAttempt(
    responsibilityId: string,
    dto: RecordFollowThroughAttemptDto,
    caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    await this.assertOwnedOpenResponsibility(responsibilityId, caller);
    if (dto.result === PeopleFollowThroughAttemptResult.RESCHEDULED && !dto.nextAttemptAt) {
      throw new ConflictException('A rescheduled follow-through attempt requires nextAttemptAt');
    }

    const now = new Date().toISOString();
    const nextAttemptAt = dto.nextAttemptAt ? new Date(dto.nextAttemptAt).toISOString() : null;
    const note = dto.note ? this.cleanRequired(dto.note, 'note') : null;
    const next = await this.mutateContract(
      responsibilityId,
      caller.id,
      (current) => {
        if (SATISFIED_STATES.has(current.state)) return current;
        const blocked = dto.result === PeopleFollowThroughAttemptResult.BLOCKED;
        return {
          ...current,
          state:
            current.state === PeopleFollowThroughState.DISPUTED
              ? PeopleFollowThroughState.DISPUTED
              : blocked
                ? PeopleFollowThroughState.BLOCKED
                : PeopleFollowThroughState.WAITING,
          attemptCount: current.attemptCount + 1,
          lastAttemptAt: now,
          nextAttemptAt,
          reviewRequired: current.reviewRequired || blocked,
          reviewReason: blocked
            ? 'A recorded follow-through attempt is blocked and needs a responsible continuation route.'
            : current.reviewReason,
          history: [
            ...current.history,
            {
              event: 'ATTEMPT_RECORDED',
              knownAt: now,
              actor: 'MEMBER',
              actorUserId: caller.id,
              result: dto.result,
              ...(note ? { note } : {}),
            },
          ],
        };
      },
      dto.expectedRevision,
    );
    return this.toResponse(responsibilityId, next);
  }

  async reportDueChange(
    responsibilityId: string,
    dto: ReportFollowThroughDueChangeDto,
    caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    await this.assertOwnedOpenResponsibility(responsibilityId, caller);
    const proposedDueAt = new Date(dto.dueAt).toISOString();
    const dueBasis = dto.dueBasis ? this.cleanRequired(dto.dueBasis, 'dueBasis') : null;
    const now = new Date().toISOString();

    const next = await this.prisma.db.$transaction(async (tx) => {
      const row = await tx.responsibility.findFirst({
        where: {
          id: responsibilityId,
          principalUserId: caller.id,
          kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
          status: { in: OPEN_RESPONSIBILITY_STATUSES },
        },
      });
      if (!row) throw new NotFoundException('Open Personal Need Responsibility not found');
      const criteria = this.asRecord(row.successCriteria);
      const current = this.contractFromCriteria(criteria);
      this.assertExpectedRevision(current, dto.expectedRevision);

      const verified = current.dueProvenance === PeopleFollowThroughDueProvenance.VERIFIED;
      const changedContract: FollowThroughContract = verified
        ? {
            ...current,
            state: PeopleFollowThroughState.DISPUTED,
            reviewRequired: true,
            reviewReason:
              'The member reported a date that differs from the currently verified due date. Aureus preserved the verified date pending source review.',
            history: [
              ...current.history,
              {
                event: 'DUE_CHANGE_REPORTED_AGAINST_VERIFIED_DATE',
                knownAt: now,
                actor: 'MEMBER',
                actorUserId: caller.id,
                previousDueAt: current.dueAt,
                proposedDueAt,
                ...(dueBasis ? { note: dueBasis } : {}),
              },
            ],
          }
        : {
            ...current,
            dueAt: proposedDueAt,
            dueBasis: dueBasis ?? 'Member-reported due-date correction.',
            state:
              current.state === PeopleFollowThroughState.MISSED
                ? PeopleFollowThroughState.PENDING
                : current.state,
            reviewRequired: false,
            reviewReason: null,
            history: [
              ...current.history,
              {
                event: 'REPORTED_DUE_DATE_CORRECTED',
                knownAt: now,
                actor: 'MEMBER',
                actorUserId: caller.id,
                previousDueAt: current.dueAt,
                dueAt: proposedDueAt,
                dueProvenance: PeopleFollowThroughDueProvenance.REPORTED,
              },
            ],
          };

      const updatedContract: FollowThroughContract = {
        ...changedContract,
        revision: current.revision + 1,
      };
      const result = await tx.responsibility.updateMany({
        where: {
          id: row.id,
          principalUserId: caller.id,
          updatedAt: row.updatedAt,
          successCriteria: {
            path: ['step5FollowThrough', 'revision'],
            equals: current.revision,
          },
        },
        data: {
          successCriteria: {
            ...criteria,
            step5FollowThrough: updatedContract,
          } as unknown as Prisma.InputJsonValue,
          ...(!verified ? { dueAt: new Date(proposedDueAt) } : {}),
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'Follow-through state changed concurrently; retry from the current truth',
        );
      }
      return updatedContract;
    });

    if (next.reviewRequired) {
      await this.notifyAssignedStewardForReview(caller.id, responsibilityId, next);
    }
    return this.toResponse(responsibilityId, next);
  }

  async verifyDue(
    responsibilityId: string,
    dto: VerifyFollowThroughDueDto,
    caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    const responsibility = await this.getOpenResponsibilityForStaff(responsibilityId, caller);
    const dueAt = new Date(dto.dueAt).toISOString();
    const source = this.verifiedPointer(dto);
    const now = new Date().toISOString();
    const dueBasis = dto.dueBasis
      ? this.cleanRequired(dto.dueBasis, 'dueBasis')
      : 'Verified source-backed due date.';

    const next = await this.mutateWithEvidence(
      responsibility.id,
      responsibility.principalUserId!,
      (current) => {
        const last = current.history[current.history.length - 1];
        if (
          current.dueProvenance === PeopleFollowThroughDueProvenance.VERIFIED &&
          current.dueAt === dueAt &&
          last?.event === 'DUE_DATE_VERIFIED' &&
          last.source?.sourceRecordId === source.sourceRecordId
        ) {
          return current;
        }
        return {
          ...current,
          dueAt,
          dueProvenance: PeopleFollowThroughDueProvenance.VERIFIED,
          dueBasis,
          state:
            current.state === PeopleFollowThroughState.DISPUTED ||
            current.state === PeopleFollowThroughState.MISSED
              ? PeopleFollowThroughState.PENDING
              : current.state,
          reviewRequired: false,
          reviewReason: null,
          history: [
            ...current.history,
            {
              event: 'DUE_DATE_VERIFIED',
              knownAt: now,
              actor: 'SYSTEM',
              actorUserId: caller.id,
              previousDueAt: current.dueAt,
              dueAt,
              dueProvenance: PeopleFollowThroughDueProvenance.VERIFIED,
              source,
            },
          ],
        };
      },
      new Date(dueAt),
      source,
      dto.expectedRevision,
    );
    return this.toResponse(responsibilityId, next);
  }

  async reportSatisfied(
    responsibilityId: string,
    dto: ReportFollowThroughSatisfactionDto,
    caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    await this.assertOwnedOpenResponsibility(responsibilityId, caller);
    const now = new Date().toISOString();
    const note = dto.note ? this.cleanRequired(dto.note, 'note') : null;
    const next = await this.mutateWithEvidence(
      responsibilityId,
      caller.id,
      (current) => {
        if (SATISFIED_STATES.has(current.state)) return current;
        return {
          ...current,
          state: PeopleFollowThroughState.SATISFIED_REPORTED,
          reportedSatisfiedAt: now,
          nextAttemptAt: null,
          reviewRequired: false,
          reviewReason: null,
          history: [
            ...current.history,
            {
              event: 'SATISFACTION_REPORTED',
              knownAt: now,
              actor: 'MEMBER',
              actorUserId: caller.id,
              ...(note ? { note } : {}),
            },
          ],
        };
      },
      undefined,
      {
        sourceSystem: 'PEOPLE_FOLLOW_THROUGH',
        sourceRecordType: 'Step5FollowThroughContract',
        sourceRecordId: 'SELF',
        sourceState: PeopleFollowThroughState.SATISFIED_REPORTED,
        evidenceLevel: 'REPORTED',
      },
      dto.expectedRevision,
    );

    // Satisfaction of this sourced must is not evidence that the member's
    // underlying housing need is resolved. Step 1 remains the only terminal
    // outcome boundary for PERSONAL_NEED_RESOLUTION.
    return this.toResponse(responsibilityId, next);
  }

  async verifySatisfied(
    responsibilityId: string,
    dto: VerifyFollowThroughSatisfactionDto,
    caller: AuthenticatedUser,
  ): Promise<PeopleFollowThroughResponseDto> {
    const responsibility = await this.getOpenResponsibilityForStaff(responsibilityId, caller);
    const source = this.verifiedPointer(dto);
    const now = new Date().toISOString();
    const next = await this.mutateWithEvidence(
      responsibility.id,
      responsibility.principalUserId!,
      (current) => {
        if (current.state === PeopleFollowThroughState.SATISFIED_VERIFIED) return current;
        return {
          ...current,
          state: PeopleFollowThroughState.SATISFIED_VERIFIED,
          verifiedSatisfiedAt: now,
          nextAttemptAt: null,
          reviewRequired: false,
          reviewReason: null,
          history: [
            ...current.history,
            {
              event: 'SATISFACTION_VERIFIED',
              knownAt: now,
              actor: 'SYSTEM',
              actorUserId: caller.id,
              source,
            },
          ],
        };
      },
      undefined,
      source,
      dto.expectedRevision,
    );
    return this.toResponse(responsibilityId, next);
  }

  async findAssigned(caller: AuthenticatedUser): Promise<AssignedFollowThroughResponseDto[]> {
    if (!hasRole(caller, [UserRole.STEWARD, ...PLATFORM_ADMIN_ROLES])) {
      throw new ForbiddenException(
        'Only Human Stewards or platform administrators may read assigned follow-through',
      );
    }

    const isAdmin = hasRole(caller, PLATFORM_ADMIN_ROLES);
    let memberIds: string[] | null = null;
    if (!isAdmin) {
      const relationships = await this.collectActiveRelationships(caller.id);
      memberIds = [...new Set(relationships.map((row) => row.memberId))];
      if (memberIds.length === 0) return [];
    }

    const rows = await this.prisma.db.responsibility.findMany({
      where: {
        ...(memberIds ? { principalUserId: { in: memberIds } } : {}),
        kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
        status: { in: OPEN_RESPONSIBILITY_STATUSES },
      },
      orderBy: { dueAt: 'asc' },
    });

    return rows.flatMap((row) => {
      const contract = this.tryContract(row.successCriteria);
      if (!contract) return [];
      if (contract.owner !== PeopleFollowThroughOwner.HUMAN_STEWARD && !contract.reviewRequired) {
        return [];
      }
      return [
        {
          responsibilityId: row.id,
          memberId: row.principalUserId!,
          obligationId: contract.obligationId,
          revision: contract.revision,
          kind: contract.kind,
          owner: contract.owner,
          dueAt: contract.dueAt,
          nextAttemptAt: contract.nextAttemptAt,
          state: contract.state,
          reviewRequired: contract.reviewRequired,
        },
      ];
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runFollowThroughSweep(): Promise<void> {
    const now = new Date();
    const rows = await this.prisma.db.responsibility.findMany({
      where: {
        kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
        status: { in: OPEN_RESPONSIBILITY_STATUSES },
      },
      orderBy: { updatedAt: 'asc' },
      take: 500,
    });

    for (const row of rows) {
      if (!row.principalUserId) continue;
      const contract = this.tryContract(row.successCriteria);
      if (!contract || SATISFIED_STATES.has(contract.state)) continue;

      const due = new Date(contract.dueAt);
      const nextAttempt = contract.nextAttemptAt ? new Date(contract.nextAttemptAt) : null;
      if (nextAttempt && nextAttempt <= now) {
        await this.notifications.notify({
          recipientId: row.principalUserId,
          category: NotificationCategory.STEWARDSHIP,
          type: 'people_follow_through_retry_due',
          title: 'A follow-through check is due',
          body: 'A housing follow-through item is ready for its next check. Open Aureus to review what happens next.',
          data: { responsibilityId: row.id, obligationId: contract.obligationId },
          dedupeKey: `people-step5:${contract.obligationId}:retry:${contract.nextAttemptAt}`,
        });
      }

      const hoursUntilDue = (due.getTime() - now.getTime()) / 3_600_000;
      if (hoursUntilDue >= 0 && hoursUntilDue <= 24) {
        await this.notifications.notify({
          recipientId: row.principalUserId,
          category: NotificationCategory.STEWARDSHIP,
          type: 'people_follow_through_due_soon',
          title: 'A housing follow-through item is due soon',
          body: 'Something Aureus is carrying with you is due within 24 hours. Open Aureus to review the current source, owner, and next step.',
          data: { responsibilityId: row.id, obligationId: contract.obligationId },
          dedupeKey: `people-step5:${contract.obligationId}:due:${contract.dueAt}`,
        });
      }

      if (due < now) {
        let missed = contract;
        try {
          if (contract.state !== PeopleFollowThroughState.MISSED) {
            missed = await this.mutateContract(row.id, row.principalUserId, (current) => {
              if (SATISFIED_STATES.has(current.state) || new Date(current.dueAt) >= now) {
                return current;
              }
              return {
                ...current,
                state: PeopleFollowThroughState.MISSED,
                reviewRequired: true,
                reviewReason:
                  'The current due time passed without evidence that the sourced obligation was satisfied.',
                history: [
                  ...current.history,
                  {
                    event: 'DUE_TIME_PASSED_WITHOUT_SATISFACTION_EVIDENCE',
                    knownAt: now.toISOString(),
                    actor: 'SYSTEM',
                    dueAt: current.dueAt,
                    dueProvenance: current.dueProvenance,
                  },
                ],
              };
            });
          }

          // The row may have been satisfied or rescheduled after the sweep's
          // initial read. Never send a stale "missed" notice in that case.
          if (missed.state !== PeopleFollowThroughState.MISSED) continue;

          // Notifications are deliberately retried on later sweeps even when
          // MISSED is already persisted. Dedupe keys keep this idempotent, and
          // a transient notification failure cannot permanently silence the
          // responsible-continuation signal.
          await this.notifications.notify({
            recipientId: row.principalUserId,
            category: NotificationCategory.STEWARDSHIP,
            type: 'people_follow_through_missed',
            title: 'A housing follow-through item needs attention',
            body: 'The current due time passed without completion evidence. Aureus kept the underlying Responsibility open and marked the item for responsible continuation.',
            data: { responsibilityId: row.id, obligationId: missed.obligationId },
            dedupeKey: `people-step5:${missed.obligationId}:missed:${missed.dueAt}`,
          });
          await this.notifyAssignedStewardForReview(row.principalUserId, row.id, missed);
        } catch (error) {
          if (!(error instanceof ConflictException)) throw error;
        }
      }
    }
  }

  private async createContract(
    responsibilityId: string,
    principalUserId: string,
    contract: FollowThroughContract,
  ): Promise<void> {
    await this.prisma.db.$transaction(async (tx) => {
      const row = await tx.responsibility.findFirst({
        where: {
          id: responsibilityId,
          principalUserId,
          kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
          status: { in: OPEN_RESPONSIBILITY_STATUSES },
        },
      });
      if (!row) throw new NotFoundException('Open Personal Need Responsibility not found');
      const criteria = this.asRecord(row.successCriteria);
      if (criteria.step5FollowThrough) {
        throw new ConflictException('A Step 5 Obligation already exists for this first proof');
      }
      const result = await tx.responsibility.updateMany({
        where: { id: row.id, principalUserId, updatedAt: row.updatedAt },
        data: {
          successCriteria: {
            ...criteria,
            step5FollowThrough: contract,
          } as unknown as Prisma.InputJsonValue,
          dueAt: new Date(contract.dueAt),
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'Responsibility changed while the Obligation was being recorded; retry',
        );
      }
    });
  }

  private async mutateContract(
    responsibilityId: string,
    principalUserId: string,
    mutate: (current: FollowThroughContract) => FollowThroughContract,
    expectedRevision?: number,
  ): Promise<FollowThroughContract> {
    return this.prisma.db.$transaction(async (tx) => {
      const row = await tx.responsibility.findFirst({
        where: {
          id: responsibilityId,
          principalUserId,
          kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
          status: { in: OPEN_RESPONSIBILITY_STATUSES },
        },
      });
      if (!row) throw new NotFoundException('Open Personal Need Responsibility not found');
      const criteria = this.asRecord(row.successCriteria);
      const current = this.contractFromCriteria(criteria);
      const next = mutate(current);
      if (next === current) return current;
      if (expectedRevision !== undefined) {
        this.assertExpectedRevision(current, expectedRevision);
      }
      const revised: FollowThroughContract = {
        ...next,
        revision: current.revision + 1,
      };
      const result = await tx.responsibility.updateMany({
        where: {
          id: row.id,
          principalUserId,
          updatedAt: row.updatedAt,
          successCriteria: {
            path: ['step5FollowThrough', 'revision'],
            equals: current.revision,
          },
        },
        data: {
          successCriteria: {
            ...criteria,
            step5FollowThrough: revised,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'Follow-through state changed concurrently; retry from the current truth',
        );
      }
      return revised;
    });
  }

  private async mutateWithEvidence(
    responsibilityId: string,
    principalUserId: string,
    mutate: (current: FollowThroughContract) => FollowThroughContract,
    dueAt: Date | undefined,
    evidence: EvidencePointer,
    expectedRevision: number,
  ): Promise<FollowThroughContract> {
    return this.prisma.db.$transaction(async (tx) => {
      const row = await tx.responsibility.findFirst({
        where: {
          id: responsibilityId,
          principalUserId,
          kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
          status: { in: OPEN_RESPONSIBILITY_STATUSES },
        },
      });
      if (!row) throw new NotFoundException('Open Personal Need Responsibility not found');
      const criteria = this.asRecord(row.successCriteria);
      const current = this.contractFromCriteria(criteria);
      const next = mutate(current);
      if (next === current) return current;
      this.assertExpectedRevision(current, expectedRevision);
      const revised: FollowThroughContract = {
        ...next,
        revision: current.revision + 1,
      };

      const result = await tx.responsibility.updateMany({
        where: {
          id: row.id,
          principalUserId,
          updatedAt: row.updatedAt,
          successCriteria: {
            path: ['step5FollowThrough', 'revision'],
            equals: current.revision,
          },
        },
        data: {
          successCriteria: {
            ...criteria,
            step5FollowThrough: revised,
          } as unknown as Prisma.InputJsonValue,
          ...(dueAt ? { dueAt } : {}),
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'Follow-through state changed concurrently; retry from the current truth',
        );
      }

      // OR-001's database contract intentionally defines ACTION_EVIDENCED as
      // a SYSTEM-observed source event with no actorUserId. Human/member
      // identity is retained in the Step-5 history above; the shared evidence
      // ledger remains within its existing platform-wide invariant.
      await tx.responsibilityEvent.create({
        data: {
          responsibilityId,
          type: ResponsibilityEventType.ACTION_EVIDENCED,
          actorClass: ResponsibilityActorClass.SYSTEM,
          actorUserId: null,
          sourceSystem: evidence.sourceSystem,
          sourceRecordType: evidence.sourceRecordType,
          sourceRecordId:
            evidence.sourceRecordId === 'SELF' ? revised.obligationId : evidence.sourceRecordId,
          sourceState: evidence.sourceState,
          evidenceLevel:
            evidence.evidenceLevel === 'VERIFIED'
              ? ResponsibilityEvidenceLevel.VERIFIED
              : ResponsibilityEvidenceLevel.REPORTED,
        },
      });
      return revised;
    });
  }

  private async alignResponsibilityWaitingState(
    responsibilityId: string,
    owner: PeopleFollowThroughOwner,
    caller: AuthenticatedUser,
  ): Promise<void> {
    if (owner === PeopleFollowThroughOwner.MEMBER) {
      await this.responsibilities.markPersonalNeedWaitingOnUser(responsibilityId, caller);
    } else if (owner === PeopleFollowThroughOwner.THIRD_PARTY) {
      await this.responsibilities.markPersonalNeedWaitingOnThirdParty(responsibilityId, caller);
    } else if (owner === PeopleFollowThroughOwner.AUREUS) {
      await this.responsibilities.resumePersonalNeedForAureus(responsibilityId, caller);
    }
  }

  private async assertOwnedOpenResponsibility(
    responsibilityId: string,
    caller: AuthenticatedUser,
  ): Promise<void> {
    const responsibility = await this.responsibilities.findOwnedPersonalNeedResolution(
      responsibilityId,
      caller,
    );
    this.assertOpenResponsibility(responsibility.status);
    this.contractFromCriteria(responsibility.successCriteria);
  }

  private assertOpenResponsibility(status: ResponsibilityStatus): void {
    if (TERMINAL_RESPONSIBILITY_STATUSES.includes(status)) {
      throw new ConflictException(`Underlying Responsibility is already terminal in ${status}`);
    }
  }

  private async getOpenResponsibilityForStaff(responsibilityId: string, caller: AuthenticatedUser) {
    const row = await this.prisma.db.responsibility.findFirst({
      where: {
        id: responsibilityId,
        kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
        status: { in: OPEN_RESPONSIBILITY_STATUSES },
      },
    });
    if (!row?.principalUserId) {
      throw new NotFoundException('Open Personal Need Responsibility not found');
    }
    await this.assertStaffForMember(row.principalUserId, caller);
    this.contractFromCriteria(row.successCriteria);
    return row;
  }

  private async assertStaffForMember(memberId: string, caller: AuthenticatedUser): Promise<void> {
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;
    if (!hasRole(caller, [UserRole.STEWARD])) {
      throw new NotFoundException('Open Personal Need Responsibility not found');
    }
    const result = await this.relationships.findAll({
      page: 1,
      limit: 20,
      memberId,
      stewardId: caller.id,
      status: StewardshipRelationshipStatus.ACTIVE,
    });
    if (!result.data.some((row) => row.stewardId === caller.id)) {
      throw new NotFoundException('Open Personal Need Responsibility not found');
    }
  }

  private async findActiveRelationship(memberId: string): Promise<StewardshipRelationship | null> {
    const result = await this.relationships.findAll({
      page: 1,
      limit: 20,
      memberId,
      status: StewardshipRelationshipStatus.ACTIVE,
    });
    return result.data.find((row) => row.stewardId) ?? null;
  }

  private async collectActiveRelationships(stewardId?: string): Promise<StewardshipRelationship[]> {
    const all: StewardshipRelationship[] = [];
    let page = 1;
    while (page <= 10) {
      const result = await this.relationships.findAll({
        page,
        limit: 100,
        stewardId,
        status: StewardshipRelationshipStatus.ACTIVE,
      });
      all.push(...result.data);
      if (all.length >= result.total || result.data.length === 0) break;
      page += 1;
    }
    return all;
  }

  private async notifyAssignedStewardForReview(
    memberId: string,
    responsibilityId: string,
    contract: FollowThroughContract,
  ): Promise<void> {
    const relationship = await this.findActiveRelationship(memberId);
    if (!relationship?.stewardId) return;
    await this.notifications.notify({
      recipientId: relationship.stewardId,
      category: NotificationCategory.STEWARDSHIP,
      type: 'people_follow_through_review_required',
      title: 'Assigned follow-through needs review',
      body: 'An assigned member has a housing follow-through item that needs bounded Steward review. Open the Steward queue for the minimum necessary status.',
      data: { responsibilityId, obligationId: contract.obligationId },
      dedupeKey: `people-step5:${contract.obligationId}:review:${contract.dueAt}:${contract.state}`,
    });
  }

  private verifiedPointer(input: {
    sourceSystem: string;
    sourceRecordType: string;
    sourceRecordId: string;
    sourceState: string;
  }): EvidencePointer {
    return {
      sourceSystem: this.cleanRequired(input.sourceSystem, 'sourceSystem'),
      sourceRecordType: this.cleanRequired(input.sourceRecordType, 'sourceRecordType'),
      sourceRecordId: this.cleanRequired(input.sourceRecordId, 'sourceRecordId'),
      sourceState: this.cleanRequired(input.sourceState, 'sourceState'),
      evidenceLevel: 'VERIFIED',
    };
  }

  private statedNeedId(criteria: CriteriaRecord): string {
    if (typeof criteria.statedNeedId !== 'string' || !criteria.statedNeedId) {
      throw new ConflictException(
        'Personal Need Responsibility is missing canonical StatedNeed provenance',
      );
    }
    return criteria.statedNeedId;
  }

  private contractFromCriteria(criteria: unknown): FollowThroughContract {
    const contract = this.tryContract(criteria);
    if (!contract) {
      throw new NotFoundException(
        'No Step 5 follow-through Obligation exists for this Responsibility',
      );
    }
    return contract;
  }

  private tryContract(criteria: unknown): FollowThroughContract | null {
    const raw = this.asRecord(criteria).step5FollowThrough;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const candidate = raw as unknown as FollowThroughContract;
    if (
      candidate.version !== STEP5_VERSION ||
      candidate.domain !== 'HOUSING' ||
      typeof candidate.obligationId !== 'string' ||
      !Number.isInteger(candidate.revision) ||
      candidate.revision < 1 ||
      typeof candidate.dueAt !== 'string' ||
      !Array.isArray(candidate.history)
    ) {
      return null;
    }
    return candidate;
  }

  private asRecord(value: unknown): CriteriaRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as CriteriaRecord;
  }

  private cleanRequired(value: string, field: string): string {
    const cleaned = sanitizePlainText(value);
    if (!cleaned) throw new ConflictException(`${field} cannot be empty after sanitization`);
    return cleaned;
  }

  private assertExpectedRevision(current: FollowThroughContract, expectedRevision: number): void {
    if (current.revision !== expectedRevision) {
      throw new ConflictException(
        'Follow-through state changed since it was read; refresh the current truth before retrying',
      );
    }
  }

  private assertValidTimeZone(timeZone: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    } catch {
      throw new ConflictException('dueTimeZone must be a valid IANA time zone');
    }
  }

  private toResponse(
    responsibilityId: string,
    contract: FollowThroughContract,
  ): PeopleFollowThroughResponseDto {
    return {
      responsibilityId,
      obligationId: contract.obligationId,
      revision: contract.revision,
      domain: contract.domain,
      kind: contract.kind,
      owner: contract.owner,
      requiredAction: contract.requiredAction,
      dueAt: contract.dueAt,
      dueTimeZone: contract.dueTimeZone,
      dueProvenance: contract.dueProvenance,
      state: contract.state,
      attemptCount: contract.attemptCount,
      nextAttemptAt: contract.nextAttemptAt,
      reviewRequired: contract.reviewRequired,
      reviewReason: contract.reviewReason,
      noActionNeededFromMember:
        contract.owner !== PeopleFollowThroughOwner.MEMBER &&
        contract.state !== PeopleFollowThroughState.DISPUTED &&
        !contract.reviewRequired,
    };
  }
}
