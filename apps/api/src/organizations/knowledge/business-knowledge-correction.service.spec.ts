import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  BusinessKnowledgeSourceKind,
  BusinessKnowledgeStatus,
  BusinessKnowledgeType,
  OrganizationMemberRole,
  UserRole,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  BusinessKnowledgeCorrectionService,
  CORRECTION_REFERENCE_PREFIX,
} from './business-knowledge-correction.service';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const RECORD_ID = '22222222-2222-4222-8222-222222222222';
const CALLER: AuthenticatedUser = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'manager@example.com',
  roles: [UserRole.BUSINESS_REPRESENTATIVE],
};

const original = {
  id: RECORD_ID,
  organizationId: TENANT_ID,
  title: 'Pricing boundary',
  summary: 'Quotes require human review.',
  content: 'Ward may discuss ranges but must not fabricate a binding quote.',
  knowledgeType: BusinessKnowledgeType.PRICING_BOUNDARY,
  status: BusinessKnowledgeStatus.APPROVED,
  sourceKind: BusinessKnowledgeSourceKind.MANUAL,
  sourceReference: 'Owner policy',
  sourceUrl: null,
  sourceFileName: null,
  sourceMimeType: null,
  freshnessIntervalDays: 90,
  nextReviewAt: new Date(Date.now() + 86_400_000),
  accountableReviewerId: CALLER.id,
  submittedAt: new Date(),
  reviewedAt: new Date(),
  rejectionReason: null,
  createdById: CALLER.id,
  lastUpdatedById: CALLER.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const correction = {
  title: 'Pricing boundary',
  summary: 'Quotes require human review and site verification.',
  content: 'Ward may discuss ranges but must not fabricate a binding quote. Site verification is required.',
  knowledgeType: BusinessKnowledgeType.PRICING_BOUNDARY,
  sourceReference: 'Owner correction, August 2026',
  freshnessIntervalDays: 90,
  correctionReason: 'Clarify the site-verification requirement.',
};

describe('BusinessKnowledgeCorrectionService', () => {
  const db = {
    organizationMember: { findFirst: jest.fn() },
    businessKnowledgeRecord: { findFirst: jest.fn(), create: jest.fn() },
    tenantAuditEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: BusinessKnowledgeCorrectionService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.organizationMember.findFirst.mockResolvedValue({ role: OrganizationMemberRole.MANAGER });
    db.businessKnowledgeRecord.findFirst
      .mockResolvedValueOnce(original)
      .mockResolvedValueOnce(null);
    db.businessKnowledgeRecord.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: '44444444-4444-4444-8444-444444444444',
      ...data,
    }));
    db.tenantAuditEvent.create.mockResolvedValue({ id: 'audit-1' });
    db.$transaction.mockImplementation(async (work: (tx: typeof db) => unknown) => work(db));
    service = new BusinessKnowledgeCorrectionService({ db } as unknown as PrismaService);
  });

  it('creates a separate DRAFT and never mutates the approved source during proposal', async () => {
    const result = await service.createCorrection(TENANT_ID, RECORD_ID, correction, CALLER);

    expect(db.businessKnowledgeRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: TENANT_ID,
        status: BusinessKnowledgeStatus.DRAFT,
        sourceReference: expect.stringContaining(`${CORRECTION_REFERENCE_PREFIX}${RECORD_ID}|`),
      }),
    });
    expect(result).toMatchObject({
      correctionOf: RECORD_ID,
      originalRemainsLive: true,
      status: BusinessKnowledgeStatus.DRAFT,
    });
    expect(db.tenantAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: TENANT_ID,
        context: expect.objectContaining({
          replacesApprovedRecordId: RECORD_ID,
          approvedRecordRemainsLive: true,
        }),
      }),
    });
  });

  it('refuses a correction when the caller lacks a tenant review role', async () => {
    db.organizationMember.findFirst.mockResolvedValue(null);
    await expect(service.createCorrection(TENANT_ID, RECORD_ID, correction, CALLER)).rejects.toThrow(
      ForbiddenException,
    );
    expect(db.businessKnowledgeRecord.findFirst).not.toHaveBeenCalled();
  });

  it('conceals non-approved or cross-tenant source ids behind the same not-found outcome', async () => {
    db.businessKnowledgeRecord.findFirst.mockReset();
    db.businessKnowledgeRecord.findFirst.mockResolvedValue(null);
    await expect(service.createCorrection(TENANT_ID, RECORD_ID, correction, CALLER)).rejects.toThrow(
      NotFoundException,
    );
    expect(db.businessKnowledgeRecord.create).not.toHaveBeenCalled();
  });

  it('prevents parallel correction drafts for one approved source', async () => {
    db.businessKnowledgeRecord.findFirst.mockReset();
    db.businessKnowledgeRecord.findFirst
      .mockResolvedValueOnce(original)
      .mockResolvedValueOnce({ id: 'existing-correction' });
    await expect(service.createCorrection(TENANT_ID, RECORD_ID, correction, CALLER)).rejects.toThrow(
      ConflictException,
    );
    expect(db.businessKnowledgeRecord.create).not.toHaveBeenCalled();
  });
});
