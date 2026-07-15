import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationMemberRole, OrganizationStatus, OrganizationType, UserRole, VerificationStatus } from '@prisma/client';
import { OrganizationMembersService } from './organization-members.service';
import { ORGANIZATION_MEMBER_REPOSITORY, IOrganizationMemberRepository } from './repositories/organization-member.repository.interface';
import { ORGANIZATION_REPOSITORY, IOrganizationRepository } from '../repositories/organization.repository.interface';
import type { Organization, OrganizationMember } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const ADMIN_REP: AuthenticatedUser = { id: 'admin-rep-001', email: 'rep@example.com', roles: [UserRole.ORGANIZATION_REPRESENTATIVE] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-001', email: 'member@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 'steward@example.com', roles: [UserRole.STEWARD] };

const makeOrg = (o: Partial<Organization> = {}): Organization => ({
  id: 'org-uuid', sequenceNumber: 1, organizationRef: 'AUR-ORG-000001',
  name: 'Community Legal Aid Society', shortDescription: 'S', fullDescription: 'F',
  organizationType: OrganizationType.NONPROFIT,
  websiteUrl: 'https://legalaid.example.org', contactEmail: null, contactPhone: null,
  location: null, country: null, state: null, city: null,
  status: OrganizationStatus.ACTIVE, verificationStatus: VerificationStatus.VERIFIED, rejectionReason: null,
  datePublished: NOW, dateLastVerified: NOW,
  createdById: ADMIN_REP.id, lastUpdatedById: ADMIN_REP.id,
  createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeMembership = (o: Partial<OrganizationMember> = {}): OrganizationMember => ({
  id: 'member-row-001', organizationId: 'org-uuid', userId: ADMIN_REP.id,
  role: OrganizationMemberRole.ADMIN, createdAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IOrganizationMemberRepository> = {
  add: jest.fn(), findByOrgAndUser: jest.fn(), findByOrganization: jest.fn(), findByUser: jest.fn(),
  countAdmins: jest.fn(), updateRole: jest.fn(), remove: jest.fn(),
};

const mockOrgRepo: jest.Mocked<IOrganizationRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(),
  findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};

describe('OrganizationMembersService', () => {
  let service: OrganizationMembersService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        OrganizationMembersService,
        { provide: ORGANIZATION_MEMBER_REPOSITORY, useValue: mockRepo },
        { provide: ORGANIZATION_REPOSITORY, useValue: mockOrgRepo },
      ],
    }).compile();
    service = m.get(OrganizationMembersService);
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('allows an ADMIN representative to add a member', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser
        .mockResolvedValueOnce(makeMembership()) // caller's own membership check
        .mockResolvedValueOnce(null); // target user not yet a member
      mockRepo.add.mockResolvedValue(makeMembership({ userId: OTHER_MEMBER.id, role: OrganizationMemberRole.MEMBER }));

      const result = await service.add('org-uuid', { userId: OTHER_MEMBER.id }, ADMIN_REP);
      expect(result.userId).toBe(OTHER_MEMBER.id);
    });

    it('forbids a non-ADMIN caller', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser.mockResolvedValue(makeMembership({ role: OrganizationMemberRole.MEMBER }));

      await expect(service.add('org-uuid', { userId: OTHER_MEMBER.id }, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when the user is already a member', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser
        .mockResolvedValueOnce(makeMembership())
        .mockResolvedValueOnce(makeMembership({ userId: OTHER_MEMBER.id }));

      await expect(service.add('org-uuid', { userId: OTHER_MEMBER.id }, ADMIN_REP)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when the organization does not exist', async () => {
      mockOrgRepo.findById.mockResolvedValue(null);
      await expect(service.add('x', { userId: OTHER_MEMBER.id }, ADMIN_REP)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByOrganization', () => {
    it('allows a member to list the organization\'s members', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockRepo.findByOrganization.mockResolvedValue([makeMembership()]);

      const result = await service.findByOrganization('org-uuid', ADMIN_REP);
      expect(result).toHaveLength(1);
    });

    it('allows a Steward regardless of membership', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrganization.mockResolvedValue([]);

      await service.findByOrganization('org-uuid', STEWARD);
      expect(mockRepo.findByOrgAndUser).not.toHaveBeenCalled();
    });

    it('forbids a non-member', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser.mockResolvedValue(null);

      await expect(service.findByOrganization('org-uuid', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateRole', () => {
    it('allows an ADMIN to promote a member', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser
        .mockResolvedValueOnce(makeMembership()) // caller check
        .mockResolvedValueOnce(makeMembership({ userId: OTHER_MEMBER.id, role: OrganizationMemberRole.MEMBER })); // target
      mockRepo.updateRole.mockResolvedValue(makeMembership({ userId: OTHER_MEMBER.id, role: OrganizationMemberRole.ADMIN }));

      const result = await service.updateRole('org-uuid', OTHER_MEMBER.id, { role: OrganizationMemberRole.ADMIN }, ADMIN_REP);
      expect(result.role).toBe(OrganizationMemberRole.ADMIN);
    });

    it('prevents demoting the last remaining ADMIN', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser
        .mockResolvedValueOnce(makeMembership())
        .mockResolvedValueOnce(makeMembership());
      mockRepo.countAdmins.mockResolvedValue(1);

      await expect(
        service.updateRole('org-uuid', ADMIN_REP.id, { role: OrganizationMemberRole.MEMBER }, ADMIN_REP),
      ).rejects.toThrow(ConflictException);
    });

    it('allows demoting an ADMIN when another ADMIN remains', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser
        .mockResolvedValueOnce(makeMembership())
        .mockResolvedValueOnce(makeMembership({ userId: OTHER_MEMBER.id }));
      mockRepo.countAdmins.mockResolvedValue(2);
      mockRepo.updateRole.mockResolvedValue(makeMembership({ userId: OTHER_MEMBER.id, role: OrganizationMemberRole.MEMBER }));

      const result = await service.updateRole('org-uuid', OTHER_MEMBER.id, { role: OrganizationMemberRole.MEMBER }, ADMIN_REP);
      expect(result.role).toBe(OrganizationMemberRole.MEMBER);
    });

    it('throws NotFoundException when the target is not a member', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser
        .mockResolvedValueOnce(makeMembership())
        .mockResolvedValueOnce(null);

      await expect(
        service.updateRole('org-uuid', 'ghost', { role: OrganizationMemberRole.ADMIN }, ADMIN_REP),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('allows an ADMIN to remove another member', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser
        .mockResolvedValueOnce(makeMembership()) // caller check
        .mockResolvedValueOnce(makeMembership({ userId: OTHER_MEMBER.id, role: OrganizationMemberRole.MEMBER })); // target

      await expect(service.remove('org-uuid', OTHER_MEMBER.id, ADMIN_REP)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith('org-uuid', OTHER_MEMBER.id);
    });

    it('allows a member to remove themselves without ADMIN authority', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser.mockResolvedValue(makeMembership({ userId: OTHER_MEMBER.id, role: OrganizationMemberRole.MEMBER }));

      await expect(service.remove('org-uuid', OTHER_MEMBER.id, OTHER_MEMBER)).resolves.toBeUndefined();
    });

    it('forbids a non-ADMIN removing someone else', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser.mockResolvedValue(makeMembership({ role: OrganizationMemberRole.MEMBER }));

      await expect(service.remove('org-uuid', ADMIN_REP.id, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('prevents removing the last remaining ADMIN', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.findByOrgAndUser.mockResolvedValueOnce(makeMembership());
      mockRepo.countAdmins.mockResolvedValue(1);

      await expect(service.remove('org-uuid', ADMIN_REP.id, ADMIN_REP)).rejects.toThrow(ConflictException);
    });
  });
});
