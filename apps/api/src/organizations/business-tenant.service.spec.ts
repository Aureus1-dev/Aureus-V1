import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  BusinessKnowledgeStatus,
  BusinessPublicStatus,
  OrganizationMemberRole,
  OrganizationType,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import { BusinessTenantService } from './business-tenant.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type { PrismaService } from '../prisma/prisma.service';

const CALLER: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'operator@example.com',
  roles: [UserRole.BUSINESS_REPRESENTATIVE],
};

const organization = (role: OrganizationMemberRole | null = OrganizationMemberRole.ADMIN) => ({
  id: '22222222-2222-4222-8222-222222222222',
  tenantVersion: 1,
  organizationType: OrganizationType.BUSINESS,
  verificationStatus: VerificationStatus.VERIFIED,
  businessProfile: null,
  members: role ? [{ role, userId: CALLER.id }] : [],
});

describe('BusinessTenantService tenant isolation', () => {
  const db = {
    organization: { findFirst: jest.fn(), findMany: jest.fn() },
    businessProfile: { upsert: jest.fn() },
    businessKnowledgeRecord: { count: jest.fn() },
    tenantAuditEvent: { create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: BusinessTenantService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.businessKnowledgeRecord.count.mockResolvedValue(1);
    db.$transaction.mockImplementation(async (work: (tx: typeof db) => unknown) => work(db));
    service = new BusinessTenantService({ db } as unknown as PrismaService);
  });

  it('conceals a tenant from a caller who has no membership', async () => {
    db.organization.findFirst.mockResolvedValue(organization(null));
    await expect(service.getConsole(organization().id, CALLER)).rejects.toThrow(NotFoundException);
  });

  it('allows a viewer to read but denies profile mutation', async () => {
    db.organization.findFirst.mockResolvedValue(organization(OrganizationMemberRole.VIEWER));
    await expect(service.getConsole(organization().id, CALLER)).resolves.toMatchObject({ canManage: false });

    db.organization.findFirst.mockResolvedValue(organization(OrganizationMemberRole.VIEWER));
    await expect(service.upsertProfile(organization().id, {
      publicSlug: 'safe-business',
      serviceArea: { cities: ['Dayton'] },
      businessHours: { summary: 'Weekdays' },
      contactRoutes: [{ type: 'PHONE', value: '+1 555 0100' }],
      escalationTarget: { email: 'human@example.com' },
      onboardingStep: 5,
    }, CALLER)).rejects.toThrow(ForbiddenException);
  });

  it('denies publication until the organization is verified', async () => {
    db.organization.findFirst.mockResolvedValue({
      ...organization(),
      verificationStatus: VerificationStatus.DRAFT,
    });

    await expect(service.upsertProfile(organization().id, {
      publicSlug: 'safe-business',
      publicStatus: BusinessPublicStatus.PUBLISHED,
      serviceArea: { cities: ['Dayton'] },
      businessHours: { summary: 'Weekdays' },
      contactRoutes: [{ type: 'PHONE', value: '+1 555 0100' }],
      escalationTarget: { email: 'human@example.com' },
      onboardingStep: 5,
    }, CALLER)).rejects.toThrow(ConflictException);
    expect(db.businessProfile.upsert).not.toHaveBeenCalled();
  });

  it('denies publication until at least one current approved source can ground the Ward', async () => {
    db.organization.findFirst.mockResolvedValue(organization());
    db.businessKnowledgeRecord.count.mockResolvedValue(0);

    await expect(service.upsertProfile(organization().id, {
      publicSlug: 'safe-business',
      publicStatus: BusinessPublicStatus.PUBLISHED,
      serviceArea: { cities: ['Dayton'] },
      businessHours: { summary: 'Weekdays' },
      contactRoutes: [{ type: 'PHONE', value: '+1 555 0100' }],
      escalationTarget: { email: 'human@example.com' },
      onboardingStep: 5,
    }, CALLER)).rejects.toThrow(ConflictException);

    expect(db.businessKnowledgeRecord.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: organization().id,
        status: BusinessKnowledgeStatus.APPROVED,
      }),
    });
    expect(db.businessProfile.upsert).not.toHaveBeenCalled();
  });

  it('writes the tenant id into both the profile and append-only audit event', async () => {
    db.organization.findFirst.mockResolvedValue(organization());
    db.businessProfile.upsert.mockResolvedValue({ id: 'profile-1', onboardingCompletedAt: new Date() });
    db.tenantAuditEvent.create.mockResolvedValue({ id: 'audit-1' });

    await service.upsertProfile(organization().id, {
      publicSlug: 'safe-business',
      serviceArea: { cities: ['Dayton'] },
      businessHours: { summary: 'Weekdays' },
      contactRoutes: [{ type: 'PHONE', value: '+1 555 0100' }],
      escalationTarget: { email: 'human@example.com' },
      onboardingStep: 5,
    }, CALLER);

    expect(db.businessProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: organization().id },
    }));
    expect(db.tenantAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: organization().id, actorId: CALLER.id }),
    });
  });
});
