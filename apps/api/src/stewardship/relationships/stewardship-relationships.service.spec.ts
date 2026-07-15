import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  OrganizationMemberRole, OrganizationStatus, OrganizationType, StewardshipEndReason,
  StewardshipRelationshipOrigin, StewardshipRelationshipStatus, UserRole, UserStatus, VerificationStatus,
} from '@prisma/client';
import { StewardshipRelationshipsService } from './stewardship-relationships.service';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from './repositories/stewardship-relationship.repository.interface';
import { IStewardCapacityRepository, STEWARD_CAPACITY_REPOSITORY } from '../capacity/repositories/steward-capacity.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../users/repositories/user.repository.interface';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../../organizations/repositories/organization.repository.interface';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../../organizations/members/repositories/organization-member.repository.interface';
import { IGoalRepository, GOAL_REPOSITORY } from '../../goals/repositories/goal.repository.interface';
import { IJourneyRepository, JOURNEY_REPOSITORY } from '../../journeys/repositories/journey.repository.interface';
import { IMilestoneRepository, MILESTONE_REPOSITORY } from '../../milestones/repositories/milestone.repository.interface';
import { ITaskRepository, TASK_REPOSITORY } from '../../tasks/repositories/task.repository.interface';
import { ProfileService } from '../../users/profile/profile.service';
import { RelationshipResponseDto } from './dto/relationship-response.dto';
import type { StewardshipRelationship, User, StewardCapacity, Organization, OrganizationMember } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'member@example.com', roles: [UserRole.MEMBER] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-002', email: 'other@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 'steward@example.com', roles: [UserRole.STEWARD] };
const OTHER_STEWARD: AuthenticatedUser = { id: 'steward-002', email: 'steward2@example.com', roles: [UserRole.STEWARD] };
const AI: AuthenticatedUser = { id: 'ai-001', email: 'ai@example.com', roles: [UserRole.AI_SERVICE_ACCOUNT] };
const ORG_ADMIN: AuthenticatedUser = { id: 'orgadmin-001', email: 'orgadmin@example.com', roles: [UserRole.ORGANIZATION_REPRESENTATIVE] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeRelationship = (o: Partial<StewardshipRelationship> = {}): StewardshipRelationship => ({
  id: 'rel-001', memberId: MEMBER.id, stewardId: STEWARD.id,
  status: StewardshipRelationshipStatus.PENDING, origin: StewardshipRelationshipOrigin.MEMBER_REQUEST,
  requestedById: MEMBER.id, assignedById: null, assignedByOrganizationId: null, recommendedById: null,
  endReason: null, endedById: null, endedAt: null, activatedAt: null,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const makeUser = (o: Partial<User> = {}): User => ({
  id: STEWARD.id, email: 'steward@example.com', emailVerified: true, passwordHash: null,
  roles: [UserRole.STEWARD], status: UserStatus.ACTIVE, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeCapacity = (o: Partial<StewardCapacity> = {}): StewardCapacity => ({
  id: 'cap-001', stewardId: STEWARD.id, maxActiveMembers: 25, updatedById: STEWARD.id,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const makeOrg = (o: Partial<Organization> = {}): Organization => ({
  id: 'org-001', sequenceNumber: 1, organizationRef: 'AUR-ORG-000001',
  name: 'Org', shortDescription: 'S', fullDescription: 'F', organizationType: OrganizationType.NONPROFIT,
  websiteUrl: 'https://example.test', contactEmail: null, contactPhone: null,
  location: null, country: null, state: null, city: null,
  status: OrganizationStatus.ACTIVE, verificationStatus: VerificationStatus.VERIFIED, rejectionReason: null,
  datePublished: NOW, dateLastVerified: NOW, createdById: ORG_ADMIN.id, lastUpdatedById: ORG_ADMIN.id,
  createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeOrgMembership = (o: Partial<OrganizationMember> = {}): OrganizationMember => ({
  id: 'orgmem-001', organizationId: 'org-001', userId: ORG_ADMIN.id, role: OrganizationMemberRole.ADMIN,
  createdAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IStewardshipRelationshipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), countActiveByStewardId: jest.fn(), update: jest.fn(),
};
const mockCapacityRepo: jest.Mocked<IStewardCapacityRepository> = { findOrCreate: jest.fn(), update: jest.fn() };
const mockUserRepo: jest.Mocked<IUserRepository> = {
  create: jest.fn(), findById: jest.fn(), findByEmail: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findAll: jest.fn(),
};
const mockOrgRepo: jest.Mocked<IOrganizationRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockOrgMemberRepo: jest.Mocked<IOrganizationMemberRepository> = {
  add: jest.fn(), findByOrgAndUser: jest.fn(), findByOrganization: jest.fn(), findByUser: jest.fn(), countAdmins: jest.fn(), updateRole: jest.fn(), remove: jest.fn(),
};
const mockGoalRepo: jest.Mocked<IGoalRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockJourneyRepo: jest.Mocked<IJourneyRepository> = {
  create: jest.fn(), findById: jest.fn(), findByGoalId: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findOwnerId: jest.fn(),
};
const mockMilestoneRepo: jest.Mocked<IMilestoneRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findOwnerId: jest.fn(),
};
const mockTaskRepo: jest.Mocked<ITaskRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findOwnerId: jest.fn(),
};
const mockProfileService = { findByUserId: jest.fn() } as unknown as ProfileService;

describe('StewardshipRelationshipsService', () => {
  let service: StewardshipRelationshipsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        StewardshipRelationshipsService,
        { provide: STEWARDSHIP_RELATIONSHIP_REPOSITORY, useValue: mockRepo },
        { provide: STEWARD_CAPACITY_REPOSITORY, useValue: mockCapacityRepo },
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        { provide: ORGANIZATION_REPOSITORY, useValue: mockOrgRepo },
        { provide: ORGANIZATION_MEMBER_REPOSITORY, useValue: mockOrgMemberRepo },
        { provide: GOAL_REPOSITORY, useValue: mockGoalRepo },
        { provide: JOURNEY_REPOSITORY, useValue: mockJourneyRepo },
        { provide: MILESTONE_REPOSITORY, useValue: mockMilestoneRepo },
        { provide: TASK_REPOSITORY, useValue: mockTaskRepo },
        { provide: ProfileService, useValue: mockProfileService },
      ],
    }).compile();
    service = m.get(StewardshipRelationshipsService);
    jest.clearAllMocks();
  });

  describe('requestSteward', () => {
    it('creates a PENDING relationship for the caller', async () => {
      mockRepo.create.mockResolvedValue(makeRelationship());
      const result = await service.requestSteward({}, MEMBER);
      expect(result).toBeInstanceOf(RelationshipResponseDto);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        memberId: MEMBER.id, origin: StewardshipRelationshipOrigin.MEMBER_REQUEST,
        status: StewardshipRelationshipStatus.PENDING,
      }));
    });

    it('validates a preferred steward actually holds the STEWARD role', async () => {
      mockUserRepo.findById.mockResolvedValue(makeUser({ roles: [UserRole.MEMBER] }));
      await expect(service.requestSteward({ preferredStewardId: 'not-a-steward' }, MEMBER))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('recommendSteward', () => {
    it('allows an AI service account to create a PENDING recommendation', async () => {
      mockUserRepo.findById.mockResolvedValue(makeUser());
      mockRepo.create.mockResolvedValue(makeRelationship({ origin: StewardshipRelationshipOrigin.AI_RECOMMENDATION }));

      const result = await service.recommendSteward({ memberId: MEMBER.id, stewardId: STEWARD.id }, AI);
      expect(result.status).toBe(StewardshipRelationshipStatus.PENDING);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        status: StewardshipRelationshipStatus.PENDING, origin: StewardshipRelationshipOrigin.AI_RECOMMENDATION,
      }));
    });

    it('forbids a non-AI caller from recommending', async () => {
      await expect(service.recommendSteward({ memberId: MEMBER.id, stewardId: STEWARD.id }, MEMBER))
        .rejects.toThrow(ForbiddenException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('assignByOrganization', () => {
    it('creates an ACTIVE relationship when the caller is a verified org ADMIN and capacity allows', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockOrgMemberRepo.findByOrgAndUser.mockResolvedValue(makeOrgMembership());
      mockUserRepo.findById.mockResolvedValue(makeUser());
      mockCapacityRepo.findOrCreate.mockResolvedValue(makeCapacity());
      mockRepo.countActiveByStewardId.mockResolvedValue(5);
      mockRepo.create.mockResolvedValue(makeRelationship({
        status: StewardshipRelationshipStatus.ACTIVE, origin: StewardshipRelationshipOrigin.ORGANIZATION_ASSIGNMENT,
      }));

      const result = await service.assignByOrganization(
        { memberId: MEMBER.id, stewardId: STEWARD.id, organizationId: 'org-001' }, ORG_ADMIN,
      );
      expect(result.status).toBe(StewardshipRelationshipStatus.ACTIVE);
    });

    it('forbids a non-ADMIN org member', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockOrgMemberRepo.findByOrgAndUser.mockResolvedValue(makeOrgMembership({ role: OrganizationMemberRole.MEMBER }));

      await expect(service.assignByOrganization(
        { memberId: MEMBER.id, stewardId: STEWARD.id, organizationId: 'org-001' }, ORG_ADMIN,
      )).rejects.toThrow(ForbiddenException);
    });

    it('forbids assignment via an unverified organization', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg({ verificationStatus: VerificationStatus.PENDING_REVIEW }));

      await expect(service.assignByOrganization(
        { memberId: MEMBER.id, stewardId: STEWARD.id, organizationId: 'org-001' }, ORG_ADMIN,
      )).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when the steward is at capacity', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockOrgMemberRepo.findByOrgAndUser.mockResolvedValue(makeOrgMembership());
      mockUserRepo.findById.mockResolvedValue(makeUser());
      mockCapacityRepo.findOrCreate.mockResolvedValue(makeCapacity({ maxActiveMembers: 5 }));
      mockRepo.countActiveByStewardId.mockResolvedValue(5);

      await expect(service.assignByOrganization(
        { memberId: MEMBER.id, stewardId: STEWARD.id, organizationId: 'org-001' }, ORG_ADMIN,
      )).rejects.toThrow(ConflictException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('assignByAdmin', () => {
    it('allows a platform administrator to create an ACTIVE relationship', async () => {
      mockUserRepo.findById.mockResolvedValue(makeUser());
      mockCapacityRepo.findOrCreate.mockResolvedValue(makeCapacity());
      mockRepo.countActiveByStewardId.mockResolvedValue(0);
      mockRepo.create.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));

      const result = await service.assignByAdmin({ memberId: MEMBER.id, stewardId: STEWARD.id }, ADMIN);
      expect(result.status).toBe(StewardshipRelationshipStatus.ACTIVE);
    });

    it('forbids a non-admin caller', async () => {
      await expect(service.assignByAdmin({ memberId: MEMBER.id, stewardId: STEWARD.id }, MEMBER))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('activate', () => {
    it('activates a PENDING relationship as platform admin', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship());
      mockUserRepo.findById.mockResolvedValue(makeUser());
      mockCapacityRepo.findOrCreate.mockResolvedValue(makeCapacity());
      mockRepo.countActiveByStewardId.mockResolvedValue(0);
      mockRepo.update.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));

      const result = await service.activate('rel-001', {}, ADMIN);
      expect(result.status).toBe(StewardshipRelationshipStatus.ACTIVE);
    });

    it('throws BadRequestException when no stewardId is available', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ stewardId: null }));
      await expect(service.activate('rel-001', {}, ADMIN)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when not PENDING', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      await expect(service.activate('rel-001', {}, ADMIN)).rejects.toThrow(ConflictException);
    });

    it('forbids a plain member from activating', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship());
      mockUserRepo.findById.mockResolvedValue(makeUser());
      await expect(service.activate('rel-001', {}, MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('end', () => {
    it('allows the member to end their own relationship for MEMBER_REQUEST', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      mockRepo.update.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ENDED }));

      const result = await service.end('rel-001', { reason: StewardshipEndReason.MEMBER_REQUEST }, MEMBER);
      expect(result.status).toBe(StewardshipRelationshipStatus.ENDED);
    });

    it('forbids a different member from ending via MEMBER_REQUEST', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      await expect(service.end('rel-001', { reason: StewardshipEndReason.MEMBER_REQUEST }, OTHER_MEMBER))
        .rejects.toThrow(ForbiddenException);
    });

    it('allows the steward to resign', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      mockRepo.update.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ENDED }));

      await service.end('rel-001', { reason: StewardshipEndReason.STEWARD_RESIGNATION }, STEWARD);
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('forbids a different steward from resigning on behalf of another', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      await expect(service.end('rel-001', { reason: StewardshipEndReason.STEWARD_RESIGNATION }, OTHER_STEWARD))
        .rejects.toThrow(ForbiddenException);
    });

    it('requires ADMIN_REASSIGNMENT / STEWARD_INACTIVITY to be performed by a platform administrator', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      await expect(service.end('rel-001', { reason: StewardshipEndReason.STEWARD_INACTIVITY }, STEWARD))
        .rejects.toThrow(ForbiddenException);

      mockRepo.update.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ENDED }));
      await expect(service.end('rel-001', { reason: StewardshipEndReason.STEWARD_INACTIVITY }, ADMIN))
        .resolves.toBeDefined();
    });

    it('allows an org ADMIN to end for ORGANIZATION_REASSIGNMENT', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({
        status: StewardshipRelationshipStatus.ACTIVE, assignedByOrganizationId: 'org-001',
      }));
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockOrgMemberRepo.findByOrgAndUser.mockResolvedValue(makeOrgMembership());
      mockRepo.update.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ENDED }));

      await service.end('rel-001', { reason: StewardshipEndReason.ORGANIZATION_REASSIGNMENT, organizationId: 'org-001' }, ORG_ADMIN);
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('throws ConflictException when already ended', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ENDED }));
      await expect(service.end('rel-001', { reason: StewardshipEndReason.MEMBER_REQUEST }, MEMBER))
        .rejects.toThrow(ConflictException);
    });

    it('allows a platform administrator to end for any reason', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      mockRepo.update.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ENDED }));

      await service.end('rel-001', { reason: StewardshipEndReason.ADMIN_REASSIGNMENT }, ADMIN);
      expect(mockRepo.update).toHaveBeenCalled();
    });
  });

  describe('reassign', () => {
    it('ends the current relationship and creates a new ACTIVE one via admin authority', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      mockRepo.update.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ENDED }));
      mockUserRepo.findById.mockResolvedValue(makeUser({ id: OTHER_STEWARD.id }));
      mockCapacityRepo.findOrCreate.mockResolvedValue(makeCapacity({ stewardId: OTHER_STEWARD.id }));
      mockRepo.countActiveByStewardId.mockResolvedValue(0);
      mockRepo.create.mockResolvedValue(makeRelationship({
        id: 'rel-002', stewardId: OTHER_STEWARD.id, status: StewardshipRelationshipStatus.ACTIVE,
      }));

      const result = await service.reassign(
        'rel-001', { newStewardId: OTHER_STEWARD.id, reason: StewardshipEndReason.ADMIN_REASSIGNMENT }, ADMIN,
      );
      expect(result.id).toBe('rel-002');
      expect(result.status).toBe(StewardshipRelationshipStatus.ACTIVE);
    });

    it('rejects a non-reassignment reason', async () => {
      await expect(service.reassign(
        'rel-001', { newStewardId: OTHER_STEWARD.id, reason: StewardshipEndReason.MEMBER_REQUEST }, ADMIN,
      )).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('is visible to the member', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship());
      expect(await service.findById('rel-001', MEMBER)).toBeInstanceOf(RelationshipResponseDto);
    });
    it('is visible to the steward', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship());
      expect(await service.findById('rel-001', STEWARD)).toBeInstanceOf(RelationshipResponseDto);
    });
    it('is not visible to an unrelated member', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.findById('rel-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
    it('throws NotFoundException for a missing relationship', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('x', ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('requires a self-scoping filter for non-admins', async () => {
      await expect(service.findAll({}, MEMBER)).rejects.toThrow(ForbiddenException);
    });
    it('allows an admin to list without a filter', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAll({}, ADMIN);
      expect(mockRepo.findAll).toHaveBeenCalled();
    });
  });

  describe('getMemberOverview', () => {
    it('returns the composed overview for the assigned steward', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      (mockProfileService.findByUserId as jest.Mock).mockResolvedValue({ userId: MEMBER.id, displayName: 'Alice' });
      mockGoalRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 });

      const result = await service.getMemberOverview('rel-001', STEWARD);
      expect(result.profile).toEqual(expect.objectContaining({ displayName: 'Alice' }));
      expect(result.goals).toEqual([]);
    });

    it('returns null profile gracefully when the member has none', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      (mockProfileService.findByUserId as jest.Mock).mockRejectedValue(new NotFoundException());
      mockGoalRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 });

      const result = await service.getMemberOverview('rel-001', STEWARD);
      expect(result.profile).toBeNull();
    });

    it('forbids a caller who is not the assigned steward', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      await expect(service.getMemberOverview('rel-001', OTHER_STEWARD)).rejects.toThrow(ForbiddenException);
    });

    it('is forbidden even for the member themselves (steward-only view)', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      await expect(service.getMemberOverview('rel-001', MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('is allowed for a platform administrator', async () => {
      mockRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.ACTIVE }));
      (mockProfileService.findByUserId as jest.Mock).mockResolvedValue(null);
      mockGoalRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 });

      await expect(service.getMemberOverview('rel-001', ADMIN)).resolves.toBeDefined();
    });
  });
});
