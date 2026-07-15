import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  OrganizationMemberRole, OrganizationStatus, OrganizationType, UserRole, VerificationStatus,
} from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { ORGANIZATION_REPOSITORY, IOrganizationRepository } from './repositories/organization.repository.interface';
import {
  ORGANIZATION_MEMBER_REPOSITORY,
  IOrganizationMemberRepository,
} from './members/repositories/organization-member.repository.interface';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import type { Organization, OrganizationMember } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const ADMIN_REP: AuthenticatedUser = { id: 'admin-rep-001', email: 'rep@example.com', roles: [UserRole.ORGANIZATION_REPRESENTATIVE] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-001', email: 'member@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 'steward@example.com', roles: [UserRole.STEWARD] };

const makeOrg = (o: Partial<Organization> = {}): Organization => ({
  id: 'org-uuid', sequenceNumber: 1, organizationRef: 'AUR-ORG-000001',
  name: 'Community Legal Aid Society', shortDescription: 'Free legal help', fullDescription: 'Full details here',
  organizationType: OrganizationType.NONPROFIT,
  websiteUrl: 'https://legalaid.example.org', contactEmail: null, contactPhone: null,
  location: null, country: null, state: null, city: null,
  status: OrganizationStatus.DRAFT, verificationStatus: VerificationStatus.DRAFT, rejectionReason: null,
  datePublished: null, dateLastVerified: null,
  createdById: ADMIN_REP.id, lastUpdatedById: ADMIN_REP.id,
  createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeMembership = (o: Partial<OrganizationMember> = {}): OrganizationMember => ({
  id: 'member-row-001', organizationId: 'org-uuid', userId: ADMIN_REP.id,
  role: OrganizationMemberRole.ADMIN, createdAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IOrganizationRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(),
  findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};

const mockMemberRepo: jest.Mocked<IOrganizationMemberRepository> = {
  add: jest.fn(), findByOrgAndUser: jest.fn(), findByOrganization: jest.fn(),
  countAdmins: jest.fn(), updateRole: jest.fn(), remove: jest.fn(),
};

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: ORGANIZATION_REPOSITORY, useValue: mockRepo },
        { provide: ORGANIZATION_MEMBER_REPOSITORY, useValue: mockMemberRepo },
      ],
    }).compile();
    service = m.get(OrganizationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates an organization, sets ref, and adds the caller as its first ADMIN member', async () => {
      const raw = makeOrg({ organizationRef: null, sequenceNumber: 1 });
      mockRepo.create.mockResolvedValue(raw);
      mockRepo.setRef.mockResolvedValue({ ...raw, organizationRef: 'AUR-ORG-000001' });
      mockMemberRepo.add.mockResolvedValue(makeMembership());

      const result = await service.create({
        name: 'Community Legal Aid Society', shortDescription: 'S', fullDescription: 'F',
        organizationType: OrganizationType.NONPROFIT, websiteUrl: 'https://legalaid.example.org',
      }, ADMIN_REP);

      expect(result).toBeInstanceOf(OrganizationResponseDto);
      expect(result.organizationRef).toBe('AUR-ORG-000001');
      expect(mockMemberRepo.add).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: raw.id, userId: ADMIN_REP.id, role: OrganizationMemberRole.ADMIN }),
      );
    });
  });

  describe('findAll', () => {
    it('defaults to VERIFIED organizations', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAll({});
      expect(mockRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ verificationStatus: VerificationStatus.VERIFIED }),
      );
    });
  });

  describe('findById / findByRef', () => {
    it('returns organization when found', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg());
      expect(await service.findById('org-uuid')).toBeInstanceOf(OrganizationResponseDto);
    });
    it('throws NotFoundException when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toThrow(NotFoundException);
    });
    it('throws NotFoundException for an unknown ref', async () => {
      mockRepo.findByRef.mockResolvedValue(null);
      await expect(service.findByRef('AUR-ORG-999999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('allows an ADMIN representative to update', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockRepo.update.mockResolvedValue(makeOrg({ name: 'Updated Name' }));

      const result = await service.update('org-uuid', { name: 'Updated Name' }, ADMIN_REP);
      expect(result.name).toBe('Updated Name');
    });

    it('allows a Steward to update regardless of membership', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg());
      mockRepo.update.mockResolvedValue(makeOrg({ name: 'Updated Name' }));

      await service.update('org-uuid', { name: 'Updated Name' }, STEWARD);
      expect(mockMemberRepo.findByOrgAndUser).not.toHaveBeenCalled();
    });

    it('forbids a non-member', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(null);

      await expect(service.update('org-uuid', {}, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('forbids a non-ADMIN member', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership({ role: OrganizationMemberRole.MEMBER }));

      await expect(service.update('org-uuid', {}, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the organization does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('x', {}, ADMIN_REP)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes for an ADMIN representative', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockRepo.softDelete.mockResolvedValue(makeOrg({ deletedAt: NOW }));

      await expect(service.remove('org-uuid', ADMIN_REP)).resolves.toBeUndefined();
    });
  });

  describe('verification workflow', () => {
    it('submitForReview moves DRAFT to PENDING_REVIEW for an ADMIN representative', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg());
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockRepo.update.mockResolvedValue(makeOrg({ verificationStatus: VerificationStatus.PENDING_REVIEW }));

      const result = await service.submitForReview('org-uuid', ADMIN_REP);
      expect(result.verificationStatus).toBe(VerificationStatus.PENDING_REVIEW);
    });

    it('submitForReview throws ConflictException when not DRAFT', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg({ verificationStatus: VerificationStatus.VERIFIED }));
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());

      await expect(service.submitForReview('org-uuid', ADMIN_REP)).rejects.toThrow(ConflictException);
    });

    it('verify moves PENDING_REVIEW to VERIFIED and sets ACTIVE status', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      mockRepo.update.mockResolvedValue(makeOrg({
        verificationStatus: VerificationStatus.VERIFIED, status: OrganizationStatus.ACTIVE,
      }));

      const result = await service.verify('org-uuid', STEWARD);
      expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(result.status).toBe(OrganizationStatus.ACTIVE);
    });

    it('verify throws ConflictException when not PENDING_REVIEW', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg({ verificationStatus: VerificationStatus.DRAFT }));
      await expect(service.verify('org-uuid', STEWARD)).rejects.toThrow(ConflictException);
    });

    it('reject moves PENDING_REVIEW to REJECTED with a reason', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      mockRepo.update.mockResolvedValue(makeOrg({
        verificationStatus: VerificationStatus.REJECTED, rejectionReason: 'Could not verify',
      }));

      const result = await service.reject('org-uuid', { rejectionReason: 'Could not verify' }, STEWARD);
      expect(result.verificationStatus).toBe(VerificationStatus.REJECTED);
      expect(result.rejectionReason).toBe('Could not verify');
    });

    it('archive sets ARCHIVED regardless of current status', async () => {
      mockRepo.findById.mockResolvedValue(makeOrg({ verificationStatus: VerificationStatus.VERIFIED }));
      mockMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockRepo.update.mockResolvedValue(makeOrg({
        verificationStatus: VerificationStatus.ARCHIVED, status: OrganizationStatus.ARCHIVED,
      }));

      const result = await service.archive('org-uuid', ADMIN_REP);
      expect(result.verificationStatus).toBe(VerificationStatus.ARCHIVED);
    });
  });
});
