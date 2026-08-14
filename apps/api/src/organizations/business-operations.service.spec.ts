import { ForbiddenException } from '@nestjs/common';
import {
  AiProvider,
  AiRequestStatus,
  BusinessKnowledgeStatus,
  BusinessPublicStatus,
  OrganizationMemberRole,
  WardLeadStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type { PrismaService } from '../prisma/prisma.service';
import { BusinessOperationsService } from './business-operations.service';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const CALLER: AuthenticatedUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'manager@example.com',
  roles: [],
};

describe('BusinessOperationsService', () => {
  const db = {
    businessProfile: { findUnique: jest.fn() },
    wardLead: { findMany: jest.fn() },
    businessKnowledgeRecord: { findMany: jest.fn() },
    aiRequest: { findMany: jest.fn() },
    organizationMember: { findMany: jest.fn(), findFirst: jest.fn() },
    organization: { findUnique: jest.fn() },
  };
  let service: BusinessOperationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BusinessOperationsService({ db } as unknown as PrismaService);
    db.businessProfile.findUnique.mockResolvedValue({
      publicStatus: BusinessPublicStatus.PUBLISHED,
      businessHours: { summary: 'Weekdays' },
      contactRoutes: [{ type: 'PHONE', value: '+1 555 0100' }],
      escalationTarget: { email: 'owner@example.com' },
      updatedAt: new Date('2026-08-14T12:00:00Z'),
    });
    db.wardLead.findMany.mockResolvedValue([
      {
        id: 'lead-1',
        status: WardLeadStatus.SUBMITTED,
        assignedToId: CALLER.id,
        assignmentNotifiedAt: null,
        submittedAt: new Date('2026-08-14T11:00:00Z'),
        lastStateChangedAt: new Date('2026-08-14T11:00:00Z'),
      },
    ]);
    db.businessKnowledgeRecord.findMany.mockResolvedValue([
      {
        id: 'knowledge-1',
        title: 'Service area',
        status: BusinessKnowledgeStatus.APPROVED,
        nextReviewAt: new Date(Date.now() + 86_400_000),
        reviewedAt: new Date(),
        accountableReviewerId: CALLER.id,
      },
      {
        id: 'knowledge-2',
        title: 'Pricing boundary',
        status: BusinessKnowledgeStatus.UNDER_REVIEW,
        nextReviewAt: new Date(Date.now() + 86_400_000),
        reviewedAt: null,
        accountableReviewerId: CALLER.id,
      },
    ]);
    db.aiRequest.findMany.mockResolvedValue([
      {
        provider: AiProvider.OPENAI,
        model: 'gpt-test',
        status: AiRequestStatus.SUCCESS,
        costUsd: 0.0123,
        latencyMs: 240,
        createdAt: new Date(),
      },
    ]);
    db.organizationMember.findMany.mockResolvedValue([
      {
        userId: CALLER.id,
        role: OrganizationMemberRole.MANAGER,
        user: { email: CALLER.email, profile: { displayName: 'Manager' } },
      },
    ]);
  });

  it('scopes every observed operational query to exactly one tenant', async () => {
    const result = await service.getSummary(TENANT_ID);

    expect(db.businessProfile.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: TENANT_ID } }));
    expect(db.wardLead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: TENANT_ID }) }));
    expect(db.businessKnowledgeRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: TENANT_ID }) }));
    expect(db.aiRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: TENANT_ID }) }));
    expect(db.organizationMember.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: TENANT_ID }) }));
    expect(result.pipeline).toMatchObject({ total: 1, awaitingNotification: 1 });
    expect(result.knowledge).toMatchObject({ currentApproved: 1, dueOrReviewing: 1 });
  });

  it('labels provider health from observed tenant ledger evidence rather than a fabricated uptime claim', async () => {
    await expect(service.getSummary(TENANT_ID)).resolves.toMatchObject({
      provider: {
        status: 'HEALTHY',
        requests: 1,
        successes: 1,
        failures: 0,
        spendUsd: 0.0123,
        averageLatencyMs: 240,
      },
    });
  });

  it('reports no traffic instead of claiming a provider is healthy when nothing was observed', async () => {
    db.aiRequest.findMany.mockResolvedValue([]);
    await expect(service.getSummary(TENANT_ID)).resolves.toMatchObject({
      provider: { status: 'NO_TRAFFIC', requests: 0, latestObservedAt: null },
    });
  });

  it('denies operational export to an operator even if the route membership guard admitted them', async () => {
    db.organizationMember.findFirst.mockResolvedValue(null);
    await expect(service.exportSnapshot(TENANT_ID, CALLER)).rejects.toThrow(ForbiddenException);
    expect(db.organization.findUnique).not.toHaveBeenCalled();
  });

  it('exports only explicitly selected tenant data and never secret-bearing Ward fields', async () => {
    db.organizationMember.findFirst.mockResolvedValue({ userId: CALLER.id });
    db.organization.findUnique.mockResolvedValue({ id: TENANT_ID, name: 'Example', organizationRef: 'AUR-1', tenantVersion: 1 });
    db.businessProfile.findUnique.mockResolvedValue({ publicSlug: 'example', publicStatus: BusinessPublicStatus.PUBLISHED });
    db.wardLead.findMany.mockResolvedValue([]);
    db.businessKnowledgeRecord.findMany.mockResolvedValue([]);
    db.aiRequest.findMany.mockResolvedValue([]);

    const result = await service.exportSnapshot(TENANT_ID, CALLER);
    expect(result.contractVersion).toBe('PF-008-export-v1');
    expect(JSON.stringify(result)).not.toMatch(/accessTokenHash|submissionFingerprint|errorMessage/);
    expect(result.boundary.excludes).toContain('Ward access-token hashes');
  });
});
