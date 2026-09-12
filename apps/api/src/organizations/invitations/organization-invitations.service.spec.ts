import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  Organization, OrganizationInvitation, OrganizationInvitationStatus, OrganizationMemberRole,
  OrganizationStatus, OrganizationType, UserRole, VerificationStatus,
} from '@prisma/client';
import { OrganizationInvitationsService } from './organization-invitations.service';
import {
  IOrganizationInvitationRepository,
  ORGANIZATION_INVITATION_REPOSITORY,
} from './repositories/organization-invitation.repository.interface';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../members/repositories/organization-member.repository.interface';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../repositories/organization.repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const OWNER: AuthenticatedUser = { id: 'owner-001', email: 'owner@example.com', roles: [UserRole.ORGANIZATION_REPRESENTATIVE] };
const INVITEE: AuthenticatedUser = { id: 'invitee-001', email: 'invitee@example.com', roles: [UserRole.MEMBER] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-001', email: 'other@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 'steward@example.com', roles: [UserRole.STEWARD] };

const makeOrg = (o: Partial<Organization> = {}): Organization => ({
  id: 'org-uuid', sequenceNumber: 1, organizationRef: 'AUR-ORG-000001',
  name: 'ABC Kitchen & Bath', shortDescription: 'S', fullDescription: 'F',
  organizationType: OrganizationType.BUSINESS, tenantVersion: 1,
  websiteUrl: 'https://abc.example.org', contactEmail: null, contactPhone: null,
  location: null, country: null, state: null, city: null,
  status: OrganizationStatus.ACTIVE, verificationStatus: VerificationStatus.VERIFIED, rejectionReason: null,
  datePublished: NOW, dateLastVerified: NOW,
  createdById: OWNER.id, lastUpdatedById: OWNER.id,
  createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeMembership = (o: Partial<{ id: string; organizationId: string; userId: string; role: OrganizationMemberRole; createdAt: Date; updatedAt: Date }> = {}) => ({
  id: 'member-row-001', organizationId: 'org-uuid', userId: OWNER.id,
  role: OrganizationMemberRole.OWNER, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeInvitation = (o: Partial<OrganizationInvitation> = {}): OrganizationInvitation => ({
  id: 'invitation-001', organizationId: 'org-uuid', invitedEmail: INVITEE.email,
  role: OrganizationMemberRole.MEMBER, status: OrganizationInvitationStatus.PENDING,
  invitedById: OWNER.id, expiresAt: FUTURE, acceptedAt: null, acceptedByUserId: null,
  declinedAt: null, revokedAt: null, revokedById: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const mockInvitationRepo: jest.Mocked<IOrganizationInvitationRepository> = {
  create: jest.fn(), findById: jest.fn(), findByOrganization: jest.fn(),
  findPendingByOrgAndEmail: jest.fn(), findPendingByEmail: jest.fn(),
  markAccepted: jest.fn(), markDeclined: jest.fn(), markRevoked: jest.fn(), markExpired: jest.fn(),
};

const mockMemberRepo: jest.Mocked<IOrganizationMemberRepository> = {
  add: jest.fn(), findByOrgAndUser: jest.fn(), findByOrganization: jest.fn(), findByUser: jest.fn(),
  countAdmins: jest.fn(), countOwners: jest.fn(), updateRole: jest.fn(), remove: jest.fn(),
};

const mockOrgRepo: jest.Mocked<IOrganizationRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(),
  findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};

const mockPrisma = {
  db: {
    organizationMember: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    organizationInvitation: { updateMany: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
    organization: { findMany: jest.fn() },
    tenantAuditEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  },
};

describe('OrganizationInvitationsService', () => {
  let service: OrganizationInvitationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        OrganizationInvitationsService,
        { provide: ORGANIZATION_INVITATION_REPOSITORY, useValue: mockInvitationRepo },
        { provide: ORGANIZATION_MEMBER_REPOSITORY, useValue: mockMemberRepo },
        { provide: ORGANIZATION_REPOSITORY, useValue: mockOrgRepo },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = m.get(OrganizationInvitationsService);
    jest.resetAllMocks();
    mockPrisma.db.tenantAuditEvent.create.mockResolvedValue({});
    // Default: run the transaction callback against the same mocked client.
    mockPrisma.db.$transaction.mockImplementation((fn: (tx: typeof mockPrisma.db) => unknown) => fn(mockPrisma.db));
  });

  describe('invite', () => {
    it('forbids a non-manager from inviting', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership({ role: OrganizationMemberRole.MEMBER }));

      await expect(
        service.invite('org-uuid', { email: INVITEE.email }, OTHER_MEMBER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects inviting with role OWNER', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());

      await expect(
        service.invite('org-uuid', { email: INVITEE.email, role: OrganizationMemberRole.OWNER }, OWNER),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a duplicate pending invitation to the same email', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockInvitationRepo.findPendingByOrgAndEmail.mockResolvedValue(makeInvitation());

      await expect(
        service.invite('org-uuid', { email: INVITEE.email }, OWNER),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects inviting an email that already belongs to a member', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockInvitationRepo.findPendingByOrgAndEmail.mockResolvedValue(null);
      mockPrisma.db.organizationMember.findFirst.mockResolvedValue(makeMembership({ userId: INVITEE.id }));

      await expect(
        service.invite('org-uuid', { email: INVITEE.email }, OWNER),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a PENDING invitation and records an audit event', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockInvitationRepo.findPendingByOrgAndEmail.mockResolvedValue(null);
      mockPrisma.db.organizationMember.findFirst.mockResolvedValue(null);
      mockInvitationRepo.create.mockResolvedValue(makeInvitation());

      const result = await service.invite('org-uuid', { email: INVITEE.email }, OWNER);

      expect(result.status).toBe('PENDING');
      expect(mockInvitationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org-uuid', invitedEmail: INVITEE.email, invitedById: OWNER.id }),
      );
      expect(mockPrisma.db.tenantAuditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'MEMBER_INVITED' }) }),
      );
    });
  });

  describe('accept', () => {
    it('throws NotFoundException for an unknown invitation', async () => {
      mockInvitationRepo.findById.mockResolvedValue(null);
      await expect(service.accept('ghost', INVITEE)).rejects.toThrow(NotFoundException);
    });

    it("forbids acceptance when the caller's email does not match", async () => {
      mockInvitationRepo.findById.mockResolvedValue(makeInvitation());
      await expect(service.accept('invitation-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('rejects acceptance of an already-resolved invitation', async () => {
      mockInvitationRepo.findById.mockResolvedValue(
        makeInvitation({ status: OrganizationInvitationStatus.REVOKED }),
      );
      await expect(service.accept('invitation-001', INVITEE)).rejects.toThrow(ConflictException);
    });

    it('lazily expires and rejects acceptance past expiresAt', async () => {
      mockInvitationRepo.findById.mockResolvedValue(makeInvitation({ expiresAt: PAST }));
      mockPrisma.db.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.accept('invitation-001', INVITEE)).rejects.toThrow(ConflictException);
      expect(mockPrisma.db.organizationInvitation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'EXPIRED' }) }),
      );
    });

    it('atomically claims the invitation and creates membership on success', async () => {
      mockInvitationRepo.findById.mockResolvedValue(makeInvitation());
      mockPrisma.db.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.db.organizationMember.findUnique.mockResolvedValue(null);
      mockPrisma.db.organizationMember.create.mockResolvedValue(makeMembership({ userId: INVITEE.id, role: OrganizationMemberRole.MEMBER }));
      mockPrisma.db.organizationInvitation.findUniqueOrThrow.mockResolvedValue(
        makeInvitation({ status: OrganizationInvitationStatus.ACCEPTED }),
      );

      const result = await service.accept('invitation-001', INVITEE);

      expect(result.status).toBe('ACCEPTED');
      expect(mockPrisma.db.organizationMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 'org-uuid', userId: INVITEE.id, role: 'MEMBER' }),
        }),
      );
    });

    it('does not create a duplicate membership if the invitee already joined by other means', async () => {
      mockInvitationRepo.findById.mockResolvedValue(makeInvitation());
      mockPrisma.db.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.db.organizationMember.findUnique.mockResolvedValue(makeMembership({ userId: INVITEE.id, role: OrganizationMemberRole.MEMBER }));
      mockPrisma.db.organizationInvitation.findUniqueOrThrow.mockResolvedValue(
        makeInvitation({ status: OrganizationInvitationStatus.ACCEPTED }),
      );

      await service.accept('invitation-001', INVITEE);

      expect(mockPrisma.db.organizationMember.create).not.toHaveBeenCalled();
    });

    it('rejects a losing concurrent claim (replay/race protection)', async () => {
      mockInvitationRepo.findById.mockResolvedValue(makeInvitation());
      mockPrisma.db.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.accept('invitation-001', INVITEE)).rejects.toThrow(ConflictException);
      expect(mockPrisma.db.organizationMember.create).not.toHaveBeenCalled();
    });
  });

  describe('decline', () => {
    it("forbids decline when the caller's email does not match", async () => {
      mockInvitationRepo.findById.mockResolvedValue(makeInvitation());
      await expect(service.decline('invitation-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('declines a pending invitation', async () => {
      mockInvitationRepo.findById.mockResolvedValue(makeInvitation());
      mockPrisma.db.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.db.organizationInvitation.findUniqueOrThrow.mockResolvedValue(
        makeInvitation({ status: OrganizationInvitationStatus.DECLINED }),
      );

      const result = await service.decline('invitation-001', INVITEE);
      expect(result.status).toBe('DECLINED');
    });

    it('rejects declining an already-resolved invitation', async () => {
      mockInvitationRepo.findById.mockResolvedValue(
        makeInvitation({ status: OrganizationInvitationStatus.ACCEPTED }),
      );
      mockPrisma.db.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.decline('invitation-001', INVITEE)).rejects.toThrow(ConflictException);
    });
  });

  describe('revoke', () => {
    it('forbids a non-manager from revoking', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership({ role: OrganizationMemberRole.MEMBER }));

      await expect(service.revoke('org-uuid', 'invitation-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it("treats an invitation from a different organization as not found (cross-tenant isolation)", async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockInvitationRepo.findById.mockResolvedValue(makeInvitation({ organizationId: 'other-org-uuid' }));

      await expect(service.revoke('org-uuid', 'invitation-001', OWNER)).rejects.toThrow(NotFoundException);
    });

    it('revokes a pending invitation as the organization OWNER', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockInvitationRepo.findById.mockResolvedValue(makeInvitation());
      mockPrisma.db.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.db.organizationInvitation.findUniqueOrThrow.mockResolvedValue(
        makeInvitation({ status: OrganizationInvitationStatus.REVOKED }),
      );

      await expect(service.revoke('org-uuid', 'invitation-001', OWNER)).resolves.toBeUndefined();
      expect(mockPrisma.db.tenantAuditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'INVITATION_REVOKED' }) }),
      );
    });

    it('rejects revoking an invitation that already resolved (double-revoke)', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockInvitationRepo.findById.mockResolvedValue(
        makeInvitation({ status: OrganizationInvitationStatus.ACCEPTED }),
      );
      mockPrisma.db.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.revoke('org-uuid', 'invitation-001', OWNER)).rejects.toThrow(ConflictException);
    });
  });

  describe('listMine', () => {
    it('returns invitations addressed to the caller, with organization names attached', async () => {
      mockInvitationRepo.findPendingByEmail.mockResolvedValue([makeInvitation()]);
      mockPrisma.db.organization.findMany.mockResolvedValue([{ id: 'org-uuid', name: 'ABC Kitchen & Bath' }]);

      const result = await service.listMine(INVITEE);
      expect(result).toHaveLength(1);
      expect(result[0].organizationName).toBe('ABC Kitchen & Bath');
    });

    it('lazily expires stale invitations instead of returning them', async () => {
      mockInvitationRepo.findPendingByEmail.mockResolvedValue([makeInvitation({ expiresAt: PAST })]);
      mockPrisma.db.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.listMine(INVITEE);
      expect(result).toHaveLength(0);
      expect(mockPrisma.db.organizationInvitation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'EXPIRED' }) }),
      );
    });
  });

  describe('listForOrganization', () => {
    it('allows a Steward regardless of membership', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockInvitationRepo.findByOrganization.mockResolvedValue([]);

      await service.listForOrganization('org-uuid', STEWARD);
      expect(mockMemberRepo.findByOrgAndUser).not.toHaveBeenCalled();
    });
  });
});
