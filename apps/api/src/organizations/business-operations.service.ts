import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  AiCapability,
  AiRequestStatus,
  BusinessKnowledgeStatus,
  OrganizationMemberRole,
  UserStatus,
  WardLeadStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

const EXPORT_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
];

const ASSIGNEE_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
  OrganizationMemberRole.OPERATOR,
];

const OBSERVATION_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class BusinessOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string) {
    const now = new Date();
    const since = new Date(now.getTime() - OBSERVATION_WINDOW_MS);

    const [profile, leads, knowledge, providerRequests, owners] = await Promise.all([
      this.prisma.db.businessProfile.findUnique({
        where: { organizationId },
        select: {
          publicStatus: true,
          businessHours: true,
          contactRoutes: true,
          escalationTarget: true,
          updatedAt: true,
        },
      }),
      this.prisma.db.wardLead.findMany({
        where: { organizationId, retentionExpiresAt: { gt: now } },
        select: {
          id: true,
          status: true,
          assignedToId: true,
          assignmentNotifiedAt: true,
          submittedAt: true,
          lastStateChangedAt: true,
        },
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
        take: 500,
      }),
      this.prisma.db.businessKnowledgeRecord.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          id: true,
          title: true,
          status: true,
          nextReviewAt: true,
          reviewedAt: true,
          accountableReviewerId: true,
        },
        orderBy: [{ nextReviewAt: 'asc' }, { id: 'asc' }],
        take: 500,
      }),
      this.prisma.db.aiRequest.findMany({
        where: {
          organizationId,
          capability: AiCapability.PUBLIC_WARD_CONVERSATION,
          createdAt: { gte: since },
        },
        select: {
          provider: true,
          model: true,
          status: true,
          costUsd: true,
          latencyMs: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1000,
      }),
      this.prisma.db.organizationMember.findMany({
        where: {
          organizationId,
          role: { in: ASSIGNEE_ROLES },
          user: { status: UserStatus.ACTIVE, deletedAt: null },
        },
        select: {
          userId: true,
          role: true,
          user: {
            select: {
              email: true,
              profile: { select: { displayName: true } },
            },
          },
        },
        orderBy: [{ role: 'asc' }, { userId: 'asc' }],
      }),
    ]);

    const pipeline = Object.values(WardLeadStatus).reduce<Record<string, number>>(
      (counts, status) => ({ ...counts, [status]: 0 }),
      {},
    );
    for (const lead of leads) pipeline[lead.status] = (pipeline[lead.status] ?? 0) + 1;

    const freshnessQueue = knowledge.filter((record) =>
      record.status === BusinessKnowledgeStatus.UNDER_REVIEW
      || (record.status === BusinessKnowledgeStatus.APPROVED && record.nextReviewAt <= now)
      || record.status === BusinessKnowledgeStatus.REJECTED,
    );

    const currentApproved = knowledge.filter(
      (record) => record.status === BusinessKnowledgeStatus.APPROVED && record.nextReviewAt > now,
    ).length;

    const successes = providerRequests.filter((request) => request.status === AiRequestStatus.SUCCESS).length;
    const failures = providerRequests.filter((request) => request.status === AiRequestStatus.FAILED).length;
    const moderationBlocks = providerRequests.filter(
      (request) => request.status === AiRequestStatus.MODERATION_BLOCKED,
    ).length;
    const spendUsd = providerRequests.reduce((sum, request) => sum + Number(request.costUsd), 0);
    const completedLatencies = providerRequests
      .map((request) => request.latencyMs)
      .filter((latency): latency is number => typeof latency === 'number' && Number.isFinite(latency));
    const averageLatencyMs = completedLatencies.length > 0
      ? Math.round(completedLatencies.reduce((sum, latency) => sum + latency, 0) / completedLatencies.length)
      : null;

    const observedStatus = providerRequests.length === 0
      ? 'NO_TRAFFIC'
      : failures > 0 && successes === 0
        ? 'UNAVAILABLE'
        : failures / Math.max(1, successes + failures) >= 0.2
          ? 'DEGRADED'
          : 'HEALTHY';

    const providers = Array.from(
      new Map(
        providerRequests.map((request) => [
          `${request.provider}:${request.model}`,
          { provider: request.provider, model: request.model },
        ]),
      ).values(),
    );

    return {
      generatedAt: now,
      pipeline: {
        total: leads.length,
        counts: pipeline,
        awaitingNotification: leads.filter((lead) => !lead.assignmentNotifiedAt).length,
        oldestOpenSubmittedAt:
          leads.find(
            (lead) => lead.status !== WardLeadStatus.CLOSED && lead.status !== WardLeadStatus.LOST,
          )?.submittedAt ?? null,
      },
      routing: {
        publicStatus: profile?.publicStatus ?? 'PRIVATE',
        businessHours: profile?.businessHours ?? {},
        contactRoutes: profile?.contactRoutes ?? [],
        escalationTarget: profile?.escalationTarget ?? null,
        fallbackRule:
          'When the Ward cannot ground an answer or the provider is unavailable, route the visitor to the configured human contact path without claiming the message was delivered.',
        updatedAt: profile?.updatedAt ?? null,
      },
      knowledge: {
        total: knowledge.length,
        currentApproved,
        dueOrReviewing: freshnessQueue.length,
        queue: freshnessQueue.slice(0, 100),
      },
      provider: {
        basis: 'Observed tenant-scoped PUBLIC_WARD_CONVERSATION ledger activity from the last 24 hours.',
        windowStartedAt: since,
        status: observedStatus,
        requests: providerRequests.length,
        successes,
        failures,
        moderationBlocks,
        spendUsd: Number(spendUsd.toFixed(6)),
        averageLatencyMs,
        latestObservedAt: providerRequests[0]?.createdAt ?? null,
        providers,
      },
      owners: owners.map((member) => ({
        userId: member.userId,
        role: member.role,
        email: member.user.email,
        displayName: member.user.profile?.displayName ?? null,
      })),
    };
  }

  async exportSnapshot(organizationId: string, caller: AuthenticatedUser) {
    await this.requireExportRole(organizationId, caller.id);
    const now = new Date();
    const since = new Date(now.getTime() - OBSERVATION_WINDOW_MS);

    const [organization, profile, leads, knowledge, providerRequests] = await Promise.all([
      this.prisma.db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, organizationRef: true, tenantVersion: true },
      }),
      this.prisma.db.businessProfile.findUnique({
        where: { organizationId },
        select: {
          publicSlug: true,
          publicStatus: true,
          serviceArea: true,
          businessHours: true,
          contactRoutes: true,
          escalationTarget: true,
          onboardingCompletedAt: true,
        },
      }),
      this.prisma.db.wardLead.findMany({
        where: { organizationId, retentionExpiresAt: { gt: now } },
        select: {
          id: true,
          displayName: true,
          contactMethod: true,
          contactValue: true,
          projectSummary: true,
          projectLocation: true,
          desiredTiming: true,
          qualificationSignals: true,
          assignedToId: true,
          status: true,
          submittedAt: true,
          acceptedAt: true,
          contactedAt: true,
          closedAt: true,
          outcomeReason: true,
          retentionExpiresAt: true,
        },
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.db.businessKnowledgeRecord.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          id: true,
          title: true,
          summary: true,
          knowledgeType: true,
          status: true,
          sourceReference: true,
          sourceUrl: true,
          freshnessIntervalDays: true,
          nextReviewAt: true,
          accountableReviewerId: true,
          submittedAt: true,
          reviewedAt: true,
          rejectionReason: true,
          updatedAt: true,
        },
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.db.aiRequest.findMany({
        where: {
          organizationId,
          capability: AiCapability.PUBLIC_WARD_CONVERSATION,
          createdAt: { gte: since },
        },
        select: {
          provider: true,
          model: true,
          status: true,
          costUsd: true,
          latencyMs: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    ]);

    return {
      contractVersion: 'PF-008-export-v1',
      generatedAt: now,
      generatedBy: caller.id,
      organization,
      profile,
      handoffs: leads,
      knowledge,
      providerObservation: {
        windowStartedAt: since,
        requests: providerRequests.map((request) => ({
          provider: request.provider,
          model: request.model,
          status: request.status,
          costUsd: Number(request.costUsd),
          latencyMs: request.latencyMs,
          createdAt: request.createdAt,
        })),
      },
      boundary: {
        excludes: [
          'Ward access-token hashes',
          'lead submission fingerprints',
          'provider error-message bodies',
          'private member data outside this business tenant',
        ],
        note: 'This export is tenant-scoped operational data. It does not admit knowledge to the Aureus Library or change any approval state.',
      },
    };
  }

  private async requireExportRole(organizationId: string, userId: string): Promise<void> {
    const membership = await this.prisma.db.organizationMember.findFirst({
      where: { organizationId, userId, role: { in: EXPORT_ROLES } },
      select: { userId: true },
    });
    if (!membership) {
      throw new ForbiddenException('Only a tenant owner, admin, or manager can export business operations');
    }
  }
}
