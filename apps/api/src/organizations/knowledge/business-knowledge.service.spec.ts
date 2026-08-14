import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  BusinessKnowledgeSourceKind,
  BusinessKnowledgeStatus,
  BusinessKnowledgeType,
  OrganizationMemberRole,
  OrganizationType,
  TenantAuditAction,
  UserRole,
} from '@prisma/client';
import { BusinessKnowledgeService } from './business-knowledge.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { PrismaService } from '../../prisma/prisma.service';

const CALLER: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'business@example.com',
  roles: [UserRole.BUSINESS_REPRESENTATIVE],
};
const TENANT_ID = '22222222-2222-4222-8222-222222222222';
const RECORD_ID = '33333333-3333-4333-8333-333333333333';
const NOW = new Date('2026-08-14T00:00:00.000Z');

const tenant = (role: OrganizationMemberRole | null = OrganizationMemberRole.ADMIN) => ({
  id: TENANT_ID,
  organizationType: OrganizationType.BUSINESS,
  members: role ? [{ role, userId: CALLER.id }] : [],
});

const record = (status = BusinessKnowledgeStatus.DRAFT) => ({
  id: RECORD_ID,
  organizationId: TENANT_ID,
  title: 'Service area',
  summary: 'Where the business operates',
  content: 'We serve Dayton and nearby communities.',
  knowledgeType: BusinessKnowledgeType.GEOGRAPHY,
  status,
  sourceKind: BusinessKnowledgeSourceKind.MANUAL,
  sourceReference: 'Owner-confirmed service map, August 2026',
  sourceUrl: null,
  sourceFileName: null,
  sourceMimeType: null,
  freshnessIntervalDays: 90,
  nextReviewAt: new Date('2026-11-12T00:00:00.000Z'),
  accountableReviewerId: CALLER.id,
  submittedAt: status === BusinessKnowledgeStatus.DRAFT ? null : NOW,
  reviewedAt: status === BusinessKnowledgeStatus.APPROVED ? NOW : null,
  rejectionReason: null,
  createdById: CALLER.id,
  lastUpdatedById: CALLER.id,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
});

describe('BusinessKnowledgeService boundaries', () => {
  const db = {
    organization: { findFirst: jest.fn() },
    businessKnowledgeRecord: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    libraryCandidateExport: { findFirst: jest.fn(), create: jest.fn() },
    tenantAuditEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: BusinessKnowledgeService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.$transaction.mockImplementation(async (work: (tx: typeof db) => unknown) => work(db));
    service = new BusinessKnowledgeService({ db } as unknown as PrismaService);
  });

  it('conceals a tenant from a non-member', async () => {
    db.organization.findFirst.mockResolvedValue(tenant(null));
    await expect(service.list(TENANT_ID, {}, CALLER)).rejects.toThrow(NotFoundException);
  });

  it('allows a viewer to read but not create knowledge', async () => {
    db.organization.findFirst.mockResolvedValue(tenant(OrganizationMemberRole.VIEWER));
    db.businessKnowledgeRecord.findMany.mockResolvedValue([]);
    await expect(service.list(TENANT_ID, {}, CALLER)).resolves.toEqual([]);

    db.organization.findFirst.mockResolvedValue(tenant(OrganizationMemberRole.VIEWER));
    await expect(service.createManual(TENANT_ID, {
      title: 'A valid title',
      summary: 'Summary',
      content: 'Long enough source content',
      knowledgeType: BusinessKnowledgeType.FAQ,
      sourceReference: 'Business owner',
      freshnessIntervalDays: 90,
    }, CALLER)).rejects.toThrow(ForbiddenException);
  });

  it('does not approve knowledge outside UNDER_REVIEW', async () => {
    db.organization.findFirst.mockResolvedValue(tenant());
    db.businessKnowledgeRecord.findFirst.mockResolvedValue(record());
    await expect(service.approve(TENANT_ID, RECORD_ID, CALLER)).rejects.toThrow(ConflictException);
  });

  it('does not export unapproved knowledge to a Library candidate', async () => {
    db.organization.findFirst.mockResolvedValue(tenant());
    db.businessKnowledgeRecord.findFirst.mockResolvedValue(record(BusinessKnowledgeStatus.UNDER_REVIEW));
    await expect(service.createLibraryCandidate(TENANT_ID, RECORD_ID, CALLER)).rejects.toThrow(ConflictException);
  });

  it('records the accountable reviewer and tenant-scoped approval audit', async () => {
    db.organization.findFirst.mockResolvedValue(tenant(OrganizationMemberRole.MANAGER));
    db.businessKnowledgeRecord.findFirst.mockResolvedValue(record(BusinessKnowledgeStatus.UNDER_REVIEW));
    db.businessKnowledgeRecord.update.mockResolvedValue(record(BusinessKnowledgeStatus.APPROVED));
    db.tenantAuditEvent.create.mockResolvedValue({ id: 'audit-1' });

    await service.approve(TENANT_ID, RECORD_ID, CALLER);

    expect(db.businessKnowledgeRecord.update).toHaveBeenCalledWith({
      where: { id: RECORD_ID },
      data: expect.objectContaining({
        status: BusinessKnowledgeStatus.APPROVED,
        accountableReviewerId: CALLER.id,
      }),
    });
    expect(db.tenantAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: TENANT_ID,
        action: TenantAuditAction.KNOWLEDGE_APPROVED,
        resourceId: RECORD_ID,
      }),
    });
  });

  it('creates a hashed candidate snapshot without granting Library authority', async () => {
    db.organization.findFirst.mockResolvedValue(tenant());
    db.businessKnowledgeRecord.findFirst.mockResolvedValue(record(BusinessKnowledgeStatus.APPROVED));
    db.libraryCandidateExport.findFirst.mockResolvedValue(null);
    db.libraryCandidateExport.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'candidate-1',
      ...data,
    }));
    db.tenantAuditEvent.create.mockResolvedValue({ id: 'audit-1' });

    const result = await service.createLibraryCandidate(TENANT_ID, RECORD_ID, CALLER);

    expect(result).toMatchObject({ organizationId: TENANT_ID, knowledgeRecordId: RECORD_ID });
    expect(result.payloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.payload).toMatchObject({ candidate_only: true, tenant_id: TENANT_ID });
  });
});
