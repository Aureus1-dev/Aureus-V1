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
import { BusinessResponsibilitiesService } from '../responsibilities/business-responsibilities.service';
import {
  availableRevenueActions,
  buildRevenueCompletionProjection,
  parseRevenueMilestones,
  REVENUE_RECORD_PREFIX,
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

@Injectable()
export class BusinessRevenueCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessResponsibilities: BusinessResponsibilitiesService,
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
    const initialLead = await this.findScopedLead(organizationId, leadId);
    const initialRole = await this.requireCurrentMember(organizationId, caller.id);
    this.assertStageRole(initialRole, dto.stage);

    let responsibility = await this.findRevenueResponsibility(organizationId, leadId);
    if (!responsibility) {
      if (TERMINAL_LEADS.has(initialLead.status)) {
        throw new ConflictException('A terminal lead cannot begin revenue completion');
      }
      responsibility = await this.ensureRevenueResponsibility(
        organizationId,
        initialLead,
        caller,
      );
    }

    const result = await this.prisma.db.$transaction(async (tx) => {
      // Serialize all revenue writes for this exact tenant + lead, not merely
      // identical request keys. Prerequisites therefore cannot be raced by two
      // different stage requests arriving at the same time.
      const lockKey = `${REVENUE_RESPONSIBILITY_PREFIX}:${organizationId}:${leadId}`;
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
      );

      const role = await this.lockCurrentMember(tx, organizationId, caller.id);
      this.assertStageRole(role, dto.stage);

      const lead = await tx.wardLead.findFirst({
        where: { id: leadId, organizationId, retentionExpiresAt: { gt: new Date() } },
      });
      if (!lead) throw new NotFoundException(`Lead '${leadId}' not found`);

      const currentResponsibility = await tx.responsibility.findFirst({
        where: {
          id: responsibility.id,
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalOrganizationId: organizationId,
          kind: ResponsibilityKind.BUSINESS_PROMISE,
          successCriteria: { path: ['domain'], equals: REVENUE_DOMAIN },
        },
        include: { events: { orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] } },
      });
      if (!currentResponsibility) {
        throw new ConflictException('Revenue responsibility changed; refresh before trying again');
      }

      const milestones = parseRevenueMilestones(currentResponsibility.events);
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

      if (dto.stage === RevenueCompletionStage.DECISION_RECORDED && !dto.decision) {
        throw new BadRequestException('A customer decision is required for DECISION_RECORDED');
      }
      if (dto.stage !== RevenueCompletionStage.DECISION_RECORDED && dto.decision) {
        throw new BadRequestException('decision is only valid for DECISION_RECORDED');
      }

      const occurredAt = new Date();
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
      };
    });

    if (result.terminal) {
      // Canonical Step 3 owns Business Responsibility completion semantics and
      // communication. If this post-commit continuation ever fails, the API
      // surfaces uncertainty; a retry with the same request key re-enters the
      // idempotent branch above and converges this completion rather than
      // writing a second revenue milestone.
      await this.businessResponsibilities.complete(
        organizationId,
        responsibility.id,
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

  private async ensureRevenueResponsibility(
    organizationId: string,
    lead: Awaited<ReturnType<BusinessRevenueCompletionService['findScopedLead']>>,
    caller: AuthenticatedUser,
  ) {
    const requestKey = revenueResponsibilityRequestKey(lead.id);
    const created = await this.businessResponsibilities.create(
      organizationId,
      {
        requestKey,
        objective: 'Carry this Kitchen & Bath sale to a recorded operations handoff or recorded loss.',
        promise:
          'Aureus will keep the revenue-completion responsibility visible until the business records an operations handoff or a loss.',
        criterion:
          'The existing lead reaches a factual terminal sales outcome: operations handoff recorded or loss recorded.',
      },
      caller,
    );

    const existingCriteria =
      created.successCriteria &&
      !Array.isArray(created.successCriteria) &&
      typeof created.successCriteria === 'object'
        ? (created.successCriteria as Prisma.JsonObject)
        : {};

    const updated = await this.prisma.db.responsibility.updateMany({
      where: {
        id: created.id,
        contextType: ResponsibilityContextType.BUSINESS_TENANT,
        principalOrganizationId: organizationId,
        kind: ResponsibilityKind.BUSINESS_PROMISE,
        OR: [
          { originConversationId: null },
          { originConversationId: lead.conversationId },
        ],
      },
      data: {
        originConversationId: lead.conversationId,
        retentionExpiresAt: lead.retentionExpiresAt,
        successCriteria: {
          ...existingCriteria,
          domain: REVENUE_DOMAIN,
          leadId: lead.id,
          evidenceSemantics: 'BUSINESS_REPORTED_REVENUE_MILESTONES',
        },
        authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
        authorityPolicyVersion: 'or004-revenue-completion-v1',
        privacyScope: ResponsibilityPrivacyScope.BUSINESS_PRIVATE,
        privacyPolicyVersion: 'business-private-v1',
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException('Revenue responsibility provenance changed; refresh before retrying');
    }

    const responsibility = await this.findRevenueResponsibility(organizationId, lead.id);
    if (!responsibility) {
      throw new ConflictException('Revenue responsibility could not be established');
    }
    return responsibility;
  }

  private async findRevenueResponsibility(organizationId: string, leadId: string) {
    const requestKey = revenueResponsibilityRequestKey(leadId);
    return this.prisma.db.responsibility.findFirst({
      where: {
        contextType: ResponsibilityContextType.BUSINESS_TENANT,
        principalOrganizationId: organizationId,
        kind: ResponsibilityKind.BUSINESS_PROMISE,
        successCriteria: {
          path: ['requestKey'],
          equals: requestKey,
        },
      },
      include: { events: { orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] } },
    });
  }

  private async requireCurrentMember(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberRole> {
    const membership = await this.prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: { organization: { select: { deletedAt: true } } },
    });
    if (!membership || membership.organization.deletedAt) {
      throw new NotFoundException('Business context not found');
    }
    return membership.role;
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

  private async findScopedLead(organizationId: string, leadId: string) {
    const lead = await this.prisma.db.wardLead.findFirst({
      where: {
        id: leadId,
        organizationId,
        retentionExpiresAt: { gt: new Date() },
        status: { notIn: [WardLeadStatus.CLOSED, WardLeadStatus.LOST] },
      },
    });
    if (!lead) {
      const terminal = await this.findScopedLeadAllowTerminal(organizationId, leadId);
      if (terminal) return terminal;
      throw new NotFoundException(`Lead '${leadId}' not found`);
    }
    return lead;
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
    lead: Awaited<ReturnType<BusinessRevenueCompletionService['findScopedLead']>>,
    toStatus: WardLeadStatus.CLOSED | WardLeadStatus.LOST,
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
