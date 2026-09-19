import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationMemberRole,
  Prisma,
  ResponsibilityActorClass,
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityEvidenceLevel,
  ResponsibilityEventType,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  ResponsibilityStatus,
  WardLeadEventType,
  WardLeadStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessResponsibilityCommunicationsService } from '../responsibilities/business-responsibility-communications.service';
import { BusinessResponsibilitiesService } from '../responsibilities/business-responsibilities.service';
import {
  availableRevenueActions,
  buildRevenueCompletionProjection,
  parseRevenueMilestones,
  REVENUE_RESPONSIBILITY_PREFIX,
  REVENUE_SOURCE_SYSTEM,
  revenueRecordType,
  revenueResponsibilityRequestKey,
  revenueSourceRecordId,
  revenueSourceState,
  type RevenueCompletionProjection,
} from './business-revenue-completion';
import {
  RecordRevenueMilestoneDto,
  RevenueCompletionStage,
  RevenueDecision,
} from './dto/record-revenue-milestone.dto';
import { buildKitchenBathReadyProject } from './kitchen-bath-ready-project';

const WORK_ROLES = new Set<OrganizationMemberRole>([
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
  OrganizationMemberRole.OPERATOR,
]);

const MANAGE_ROLES = new Set<OrganizationMemberRole>([
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
]);

const MANAGER_STAGES = new Set<RevenueCompletionStage>([
  RevenueCompletionStage.DECISION_RECORDED,
  RevenueCompletionStage.CONTRACT_RECORDED,
  RevenueCompletionStage.DEPOSIT_RECORDED,
  RevenueCompletionStage.OPERATIONS_HANDOFF_RECORDED,
]);

const TERMINAL_LEADS = new Set<WardLeadStatus>([WardLeadStatus.CLOSED, WardLeadStatus.LOST]);
const REVENUE_DOMAIN = 'OR004_REVENUE_COMPLETION';
type TerminalWardLeadStatus = 'CLOSED' | 'LOST';

@Injectable()
export class BusinessRevenueCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessResponsibilities: BusinessResponsibilitiesService,
    private readonly responsibilityCommunications: BusinessResponsibilityCommunicationsService,
  ) {}

  async projectForLead(input: {
    organizationId: string;
    lead: {
      id: string;
      conversationId: string;
      status: WardLeadStatus;
      retentionExpiresAt: Date;
      qualificationSignals: Prisma.JsonValue | null;
      projectLocation: string | null;
      desiredTiming: string | null;
      consentVersion: string;
      submittedAt: Date;
    };
    role: OrganizationMemberRole | null;
  }): Promise<RevenueCompletionProjection> {
    const readyProject = buildKitchenBathReadyProject(input.lead);
    const responsibility = await this.findRevenueResponsibility(
      input.organizationId,
      input.lead.id,
    );

    return buildRevenueCompletionProjection({
      responsibilityId: responsibility?.id ?? null,
      responsibilityStatus: responsibility?.status ?? null,
      events: responsibility?.events ?? [],
      role: input.role,
      leadStatus: input.lead.status,
      readyProjectReady: readyProject?.readinessStatus === 'READY_FOR_EXPERT_REVIEW',
    });
  }

  async record(
    organizationId: string,
    leadId: string,
    dto: RecordRevenueMilestoneDto,
    caller: AuthenticatedUser,
  ): Promise<RevenueCompletionProjection> {
    const requestKey = revenueResponsibilityRequestKey(leadId);

    const result = await this.prisma.db.$transaction(async (tx) => {
      // The exact same lock is used by legacy terminal WardLead transitions.
      // Responsibility creation, prerequisite validation, and milestone writes
      // therefore become one serialized decision about whether OR-004 started.
      const lockKey = `${REVENUE_RESPONSIBILITY_PREFIX}:${organizationId}:${leadId}`;
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
      );

      const role = await this.lockCurrentMember(tx, organizationId, caller.id);
      this.assertStageRole(role, dto.stage);
      this.assertDecisionPayload(dto);

      const lead = await tx.wardLead.findFirst({
        where: { id: leadId, organizationId, retentionExpiresAt: { gt: new Date() } },
      });
      if (!lead) throw new NotFoundException(`Lead '${leadId}' not found`);

      let currentResponsibility = await tx.responsibility.findFirst({
        where: {
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalOrganizationId: organizationId,
          kind: ResponsibilityKind.BUSINESS_PROMISE,
          successCriteria: { path: ['requestKey'], equals: requestKey },
        },
        include: { events: { orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] } },
      });

      if (
        currentResponsibility &&
        !this.isRevenueResponsibilityForLead(currentResponsibility.successCriteria, leadId)
      ) {
        throw new ConflictException(
          'Revenue responsibility request key is already bound to different work',
        );
      }

      let milestones = currentResponsibility
        ? parseRevenueMilestones(currentResponsibility.events)
        : [];
      const existing = milestones.find((milestone) => milestone.requestKey === dto.requestKey);
      if (existing) {
        if (
          existing.stage !== dto.stage ||
          existing.evidenceReference !== dto.evidenceReference ||
          existing.decision !== (dto.decision ?? null)
        ) {
          throw new ConflictException(
            'This revenue request key was already used for a different milestone report',
          );
        }
        return {
          terminal: this.isTerminalMilestone(existing.stage, existing.decision),
          role,
          responsibilityId: currentResponsibility!.id,
          acceptedResponsibility: null,
        };
      }

      if (TERMINAL_LEADS.has(lead.status)) {
        throw new ConflictException('A terminal lead cannot accept a new revenue milestone');
      }

      const readyProject = buildKitchenBathReadyProject(lead);
      const available = availableRevenueActions({
        role,
        leadStatus: lead.status,
        readyProjectReady: readyProject?.readinessStatus === 'READY_FOR_EXPERT_REVIEW',
        milestones,
      });
      if (!available.includes(dto.stage)) {
        throw new ConflictException(
          `Revenue milestone ${dto.stage} is not available from the current reported state`,
        );
      }

      let acceptedResponsibility: Awaited<
        ReturnType<BusinessRevenueCompletionService['createRevenueResponsibilityInTransaction']>
      > | null = null;
      if (!currentResponsibility) {
        currentResponsibility = await this.createRevenueResponsibilityInTransaction(
          tx,
          organizationId,
          lead,
          caller.id,
          requestKey,
        );
        acceptedResponsibility = currentResponsibility;
        milestones = [];
      }

      const lastOccurredAt = currentResponsibility.events.at(-1)?.occurredAt ?? null;
      const now = new Date();
      const occurredAt =
        lastOccurredAt && now.getTime() <= lastOccurredAt.getTime()
          ? new Date(lastOccurredAt.getTime() + 1)
          : now;
      const evidence = {
        sourceSystem: REVENUE_SOURCE_SYSTEM,
        sourceRecordType: revenueRecordType(dto.stage),
        sourceRecordId: revenueSourceRecordId(caller.id, dto.requestKey),
        sourceState: revenueSourceState(dto.evidenceReference, dto.decision),
        evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
      };

      await tx.responsibilityEvent.create({
        data: {
          responsibilityId: currentResponsibility.id,
          type: ResponsibilityEventType.ACTION_EVIDENCED,
          actorClass: ResponsibilityActorClass.SYSTEM,
          actorUserId: null,
          fromStatus: null,
          toStatus: null,
          occurredAt,
          ...evidence,
        },
      });

      if (
        dto.stage === RevenueCompletionStage.DECISION_RECORDED &&
        dto.decision === RevenueDecision.DECLINED
      ) {
        await this.closeLeadInTransaction(
          tx,
          lead,
          WardLeadStatus.LOST,
          'Customer decision reported as declined.',
          caller.id,
          occurredAt,
        );
      } else if (dto.stage === RevenueCompletionStage.OPERATIONS_HANDOFF_RECORDED) {
        await this.closeLeadInTransaction(
          tx,
          lead,
          WardLeadStatus.CLOSED,
          'Accepted sale reported as handed to operations.',
          caller.id,
          occurredAt,
        );
      }

      return {
        terminal: this.isTerminalMilestone(dto.stage, dto.decision ?? null),
        role,
        responsibilityId: currentResponsibility.id,
        acceptedResponsibility,
      };
    });

    if (result.acceptedResponsibility) {
      // Step 4 communication remains best-effort and occurs after work truth
      // commits, exactly like ordinary Business Responsibility acceptance.
      await this.responsibilityCommunications.accepted(result.acceptedResponsibility);
    }

    if (result.terminal) {
      // Canonical Step 3 owns Business Responsibility completion semantics and
      // communication. If this post-commit continuation ever fails, the API
      // surfaces uncertainty; a retry with the same request key converges the
      // completion without duplicating revenue evidence.
      await this.businessResponsibilities.complete(
        organizationId,
        result.responsibilityId,
        { confirmed: true },
        caller,
      );
    }

    const finalLead = await this.findScopedLeadAllowTerminal(organizationId, leadId);
    const finalResponsibility = await this.findRevenueResponsibility(organizationId, leadId);
    return buildRevenueCompletionProjection({
      responsibilityId: finalResponsibility?.id ?? null,
      responsibilityStatus: finalResponsibility?.status ?? null,
      events: finalResponsibility?.events ?? [],
      role: result.role,
      leadStatus: finalLead.status,
      readyProjectReady:
        buildKitchenBathReadyProject(finalLead)?.readinessStatus === 'READY_FOR_EXPERT_REVIEW',
    });
  }

  async purgeExpiredRevenueResponsibilities(now = new Date()): Promise<number> {
    const result = await this.prisma.db.responsibility.deleteMany({
      where: {
        contextType: ResponsibilityContextType.BUSINESS_TENANT,
        kind: ResponsibilityKind.BUSINESS_PROMISE,
        retentionExpiresAt: { lte: now },
        successCriteria: { path: ['domain'], equals: REVENUE_DOMAIN },
      },
    });
    return result.count;
  }

  private async createRevenueResponsibilityInTransaction(
    tx: Prisma.TransactionClient,
    organizationId: string,
    lead: Awaited<ReturnType<BusinessRevenueCompletionService['findScopedLeadAllowTerminal']>>,
    actorUserId: string,
    requestKey: string,
  ) {
    const responsibility = await tx.responsibility.create({
      data: {
        kind: ResponsibilityKind.BUSINESS_PROMISE,
        objective: 'Carry this Kitchen & Bath sale to a recorded operations handoff or recorded loss.',
        status: ResponsibilityStatus.ACTIVE,
        contextType: ResponsibilityContextType.BUSINESS_TENANT,
        principalUserId: null,
        principalOrganizationId: organizationId,
        originConversationId: lead.conversationId,
        originOpportunityId: null,
        successCriteria: {
          type: 'BUSINESS_PROMISE_REPORTED_COMPLETION',
          promise:
            'Aureus will keep the revenue-completion responsibility visible until the business records an operations handoff or a loss.',
          criterion:
            'The existing lead reaches a factual terminal sales outcome: operations handoff recorded or loss recorded.',
          requestKey,
          completionEvidence: 'CURRENT_MANAGER_ATTESTATION',
          domain: REVENUE_DOMAIN,
          leadId: lead.id,
          evidenceSemantics: 'BUSINESS_REPORTED_REVENUE_MILESTONES',
        },
        authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
        authorityPolicyVersion: 'or004-revenue-completion-v1',
        privacyScope: ResponsibilityPrivacyScope.BUSINESS_PRIVATE,
        privacyPolicyVersion: 'business-private-v1',
        dueAt: null,
        retentionExpiresAt: lead.retentionExpiresAt,
      },
    });

    const acceptedAt = new Date();
    const commitmentAt = new Date(acceptedAt.getTime() + 1);
    await tx.responsibilityEvent.createMany({
      data: [
        {
          responsibilityId: responsibility.id,
          type: ResponsibilityEventType.ACCEPTED,
          actorClass: ResponsibilityActorClass.MEMBER,
          actorUserId,
          fromStatus: null,
          toStatus: ResponsibilityStatus.ACTIVE,
          occurredAt: acceptedAt,
        },
        {
          responsibilityId: responsibility.id,
          type: ResponsibilityEventType.COMMITMENT_RECORDED,
          actorClass: ResponsibilityActorClass.AUREUS,
          actorUserId: null,
          fromStatus: null,
          toStatus: null,
          occurredAt: commitmentAt,
        },
      ],
    });

    return tx.responsibility.findUniqueOrThrow({
      where: { id: responsibility.id },
      include: { events: { orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] } },
    });
  }

  private async findRevenueResponsibility(organizationId: string, leadId: string) {
    const requestKey = revenueResponsibilityRequestKey(leadId);
    const responsibility = await this.prisma.db.responsibility.findFirst({
      where: {
        contextType: ResponsibilityContextType.BUSINESS_TENANT,
        principalOrganizationId: organizationId,
        kind: ResponsibilityKind.BUSINESS_PROMISE,
        successCriteria: { path: ['requestKey'], equals: requestKey },
      },
      include: { events: { orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] } },
    });
    if (
      responsibility &&
      !this.isRevenueResponsibilityForLead(responsibility.successCriteria, leadId)
    ) {
      throw new ConflictException('Revenue responsibility provenance does not match this lead');
    }
    return responsibility;
  }

  private async lockCurrentMember(
    tx: Prisma.TransactionClient,
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberRole> {
    const membership = await tx.$queryRaw<Array<{ role: OrganizationMemberRole }>>(
      Prisma.sql`SELECT om."role" FROM "OrganizationMember" om JOIN "Organization" o ON o."id" = om."organizationId" WHERE om."organizationId" = CAST(${organizationId} AS uuid) AND om."userId" = CAST(${userId} AS uuid) AND o."deletedAt" IS NULL FOR SHARE OF om, o`,
    );
    if (membership.length !== 1) throw new NotFoundException('Business context not found');
    return membership[0].role;
  }

  private assertStageRole(role: OrganizationMemberRole, stage: RevenueCompletionStage): void {
    const allowed = MANAGER_STAGES.has(stage) ? MANAGE_ROLES : WORK_ROLES;
    if (!allowed.has(role)) {
      throw new ForbiddenException(
        MANAGER_STAGES.has(stage)
          ? 'Only a current business owner, admin, or manager may record this revenue boundary'
          : 'This organization role cannot record revenue-completion work',
      );
    }
  }

  private assertDecisionPayload(dto: RecordRevenueMilestoneDto): void {
    if (dto.stage === RevenueCompletionStage.DECISION_RECORDED && !dto.decision) {
      throw new BadRequestException('A customer decision is required for DECISION_RECORDED');
    }
    if (dto.stage !== RevenueCompletionStage.DECISION_RECORDED && dto.decision) {
      throw new BadRequestException('decision is only valid for DECISION_RECORDED');
    }
  }

  private isRevenueResponsibilityForLead(criteria: Prisma.JsonValue, leadId: string): boolean {
    if (!criteria || Array.isArray(criteria) || typeof criteria !== 'object') return false;
    const object = criteria as Prisma.JsonObject;
    return object.domain === REVENUE_DOMAIN && object.leadId === leadId;
  }

  private async findScopedLeadAllowTerminal(organizationId: string, leadId: string) {
    const lead = await this.prisma.db.wardLead.findFirst({
      where: { id: leadId, organizationId, retentionExpiresAt: { gt: new Date() } },
    });
    if (!lead) throw new NotFoundException(`Lead '${leadId}' not found`);
    return lead;
  }

  private async closeLeadInTransaction(
    tx: Prisma.TransactionClient,
    lead: Awaited<ReturnType<BusinessRevenueCompletionService['findScopedLeadAllowTerminal']>>,
    toStatus: TerminalWardLeadStatus,
    reason: string,
    actorUserId: string,
    occurredAt: Date,
  ): Promise<void> {
    if (lead.status !== WardLeadStatus.CONTACTED) {
      throw new ConflictException(`Lead cannot move from ${lead.status} to ${toStatus}`);
    }
    const closedAt = new Date(occurredAt.getTime() + 1);
    const changed = await tx.wardLead.updateMany({
      where: {
        id: lead.id,
        organizationId: lead.organizationId,
        status: WardLeadStatus.CONTACTED,
      },
      data: {
        status: toStatus,
        lastStateChangedAt: closedAt,
        closedAt,
        outcomeReason: reason,
      },
    });
    if (changed.count !== 1) {
      throw new ConflictException('Lead state changed; refresh before trying again');
    }
    await tx.wardLeadEvent.create({
      data: {
        organizationId: lead.organizationId,
        leadId: lead.id,
        type: WardLeadEventType.STATUS_CHANGED,
        actorId: actorUserId,
        fromStatus: WardLeadStatus.CONTACTED,
        toStatus,
        reason,
        occurredAt: closedAt,
      },
    });
  }

  private isTerminalMilestone(
    stage: RevenueCompletionStage,
    decision: RevenueDecision | null,
  ): boolean {
    return (
      stage === RevenueCompletionStage.OPERATIONS_HANDOFF_RECORDED ||
      (stage === RevenueCompletionStage.DECISION_RECORDED &&
        decision === RevenueDecision.DECLINED)
    );
  }
}
