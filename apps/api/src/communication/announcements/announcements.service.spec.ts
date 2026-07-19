import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AnnouncementScope, AnnouncementStatus, OrganizationMemberRole, OrganizationStatus, OrganizationType,
  StewardshipRelationshipOrigin, StewardshipRelationshipStatus, UserRole, VerificationStatus,
} from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { ANNOUNCEMENT_REPOSITORY, IAnnouncementRepository } from './repositories/announcement.repository.interface';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../../organizations/repositories/organization.repository.interface';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../../organizations/members/repositories/organization-member.repository.interface';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../../stewardship/relationships/repositories/stewardship-relationship.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../users/repositories/user.repository.interface';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Announcement, Organization, OrganizationMember, StewardshipRelationship } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const ORG_ADMIN: AuthenticatedUser = { id: 'orgadmin-001', email: 'oa@example.com', roles: [UserRole.ORGANIZATION_REPRESENTATIVE] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeAnnouncement = (o: Partial<Announcement> = {}): Announcement => ({
  id: 'ann-001', title: 'Title', body: 'Body', scope: AnnouncementScope.PLATFORM,
  organizationId: null, targetRole: null, stewardId: null, status: AnnouncementStatus.DRAFT, isCritical: false,
  scheduledFor: null, publishedAt: null, expiresAt: null, archivedAt: null, authorId: ADMIN.id,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const makeOrg = (o: Partial<Organization> = {}): Organization => ({
  id: 'org-001', sequenceNumber: 1, organizationRef: 'AUR-ORG-000001', name: 'Acme', shortDescription: 'x', fullDescription: 'y',
  organizationType: OrganizationType.BUSINESS, websiteUrl: 'https://acme.test', contactEmail: null, contactPhone: null,
  location: null, country: null, state: null, city: null, status: OrganizationStatus.ACTIVE, verificationStatus: VerificationStatus.VERIFIED,
  rejectionReason: null, datePublished: null, dateLastVerified: null, createdById: ORG_ADMIN.id, lastUpdatedById: ORG_ADMIN.id,
  createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeMembership = (o: Partial<OrganizationMember> = {}): OrganizationMember => ({
  id: 'mem-001', organizationId: 'org-001', userId: ORG_ADMIN.id, role: OrganizationMemberRole.ADMIN, createdAt: NOW, ...o,
});

const makeRelationship = (o: Partial<StewardshipRelationship> = {}): StewardshipRelationship => ({
  id: 'rel-001', memberId: MEMBER.id, stewardId: STEWARD.id, status: StewardshipRelationshipStatus.ACTIVE,
  origin: StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT, requestedById: null, assignedById: ADMIN.id, assignedByOrganizationId: null,
  recommendedById: null, endReason: null, endedById: null, endedAt: null, activatedAt: NOW, createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IAnnouncementRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findVisibleForUser: jest.fn(), update: jest.fn(), updateStatus: jest.fn(),
};
const mockOrgRepo: jest.Mocked<IOrganizationRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockOrgMemberRepo: jest.Mocked<IOrganizationMemberRepository> = {
  add: jest.fn(), findByOrgAndUser: jest.fn(), findByOrganization: jest.fn(), findByUser: jest.fn(), countAdmins: jest.fn(), updateRole: jest.fn(), remove: jest.fn(),
};
const mockRelationshipRepo: jest.Mocked<IStewardshipRelationshipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), countActiveByStewardId: jest.fn(), update: jest.fn(),
};
const mockUserRepo: jest.Mocked<IUserRepository> = {
  create: jest.fn(), findById: jest.fn(), findByEmail: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findAll: jest.fn(),
};
const mockNotificationsService = { notify: jest.fn() } as unknown as NotificationsService;

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        { provide: ANNOUNCEMENT_REPOSITORY, useValue: mockRepo },
        { provide: ORGANIZATION_REPOSITORY, useValue: mockOrgRepo },
        { provide: ORGANIZATION_MEMBER_REPOSITORY, useValue: mockOrgMemberRepo },
        { provide: STEWARDSHIP_RELATIONSHIP_REPOSITORY, useValue: mockRelationshipRepo },
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = m.get(AnnouncementsService);
    jest.clearAllMocks();
  });

  describe('create — authorization by scope', () => {
    it('allows a Platform Administrator to author a PLATFORM announcement', async () => {
      mockRepo.create.mockResolvedValue(makeAnnouncement());
      const result = await service.create({ title: 't', body: 'b', scope: AnnouncementScope.PLATFORM }, ADMIN);
      expect(result.scope).toBe(AnnouncementScope.PLATFORM);
    });

    it('forbids a non-administrator from authoring a PLATFORM announcement', async () => {
      await expect(service.create({ title: 't', body: 'b', scope: AnnouncementScope.PLATFORM }, MEMBER))
        .rejects.toThrow(ForbiddenException);
    });

    it('strips markup from title and body before persisting (PD-001)', async () => {
      mockRepo.create.mockResolvedValue(makeAnnouncement());
      await service.create(
        { title: '<b>Big</b> News', body: '<script>alert(1)</script>Read this', scope: AnnouncementScope.PLATFORM },
        ADMIN,
      );
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Big News', body: 'Read this' }));
    });

    it('forbids a non-administrator from authoring a ROLE announcement', async () => {
      await expect(service.create({ title: 't', body: 'b', scope: AnnouncementScope.ROLE, targetRole: UserRole.MEMBER }, STEWARD))
        .rejects.toThrow(ForbiddenException);
    });

    it('allows an ADMIN organization representative to author an ORGANIZATION announcement for a verified org', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockOrgMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership());
      mockRepo.create.mockResolvedValue(makeAnnouncement({ scope: AnnouncementScope.ORGANIZATION, organizationId: 'org-001' }));

      const result = await service.create(
        { title: 't', body: 'b', scope: AnnouncementScope.ORGANIZATION, organizationId: 'org-001' }, ORG_ADMIN,
      );
      expect(result.organizationId).toBe('org-001');
    });

    it('forbids a non-ADMIN organization member from authoring an ORGANIZATION announcement', async () => {
      mockOrgRepo.findById.mockResolvedValue(makeOrg());
      mockOrgMemberRepo.findByOrgAndUser.mockResolvedValue(makeMembership({ role: OrganizationMemberRole.MEMBER }));

      await expect(service.create(
        { title: 't', body: 'b', scope: AnnouncementScope.ORGANIZATION, organizationId: 'org-001' }, ORG_ADMIN,
      )).rejects.toThrow(ForbiddenException);
    });

    it('forbids authoring an ORGANIZATION announcement without organizationId', async () => {
      await expect(service.create({ title: 't', body: 'b', scope: AnnouncementScope.ORGANIZATION }, ORG_ADMIN))
        .rejects.toThrow(BadRequestException);
    });

    it('allows a Steward to author a STEWARD_MEMBERS announcement to their own members', async () => {
      mockRepo.create.mockResolvedValue(makeAnnouncement({ scope: AnnouncementScope.STEWARD_MEMBERS, stewardId: STEWARD.id }));
      const result = await service.create({ title: 't', body: 'b', scope: AnnouncementScope.STEWARD_MEMBERS }, STEWARD);
      expect(result.stewardId).toBe(STEWARD.id);
    });

    it('forbids a member (non-steward) from authoring a STEWARD_MEMBERS announcement', async () => {
      await expect(service.create({ title: 't', body: 'b', scope: AnnouncementScope.STEWARD_MEMBERS }, MEMBER))
        .rejects.toThrow(ForbiddenException);
    });

    it('forbids a steward from announcing on behalf of a different steward', async () => {
      await expect(service.create(
        { title: 't', body: 'b', scope: AnnouncementScope.STEWARD_MEMBERS, stewardId: 'steward-002' }, STEWARD,
      )).rejects.toThrow(ForbiddenException);
    });
  });

  describe('publish', () => {
    it('publishes a DRAFT announcement and fans out to the resolved audience', async () => {
      mockRepo.findById.mockResolvedValue(makeAnnouncement());
      mockRepo.updateStatus.mockResolvedValue(makeAnnouncement({ status: AnnouncementStatus.PUBLISHED, publishedAt: NOW }));
      mockUserRepo.findAll.mockResolvedValue({ data: [{ id: 'u1' } as never, { id: 'u2' } as never], total: 2, page: 1, limit: 1000 });

      const result = await service.publish('ann-001', ADMIN);

      expect(result.status).toBe(AnnouncementStatus.PUBLISHED);
      expect(mockNotificationsService.notify).toHaveBeenCalledTimes(2);
    });

    it('rejects publishing an already-PUBLISHED announcement', async () => {
      mockRepo.findById.mockResolvedValue(makeAnnouncement({ status: AnnouncementStatus.PUBLISHED }));
      await expect(service.publish('ann-001', ADMIN)).rejects.toThrow(ConflictException);
    });

    it('resolves STEWARD_MEMBERS audience from active relationships', async () => {
      mockRepo.findById.mockResolvedValue(makeAnnouncement({ scope: AnnouncementScope.STEWARD_MEMBERS, stewardId: STEWARD.id }));
      mockRepo.updateStatus.mockResolvedValue(makeAnnouncement({ scope: AnnouncementScope.STEWARD_MEMBERS, stewardId: STEWARD.id, status: AnnouncementStatus.PUBLISHED }));
      mockRelationshipRepo.findAll.mockResolvedValue({ data: [makeRelationship()], total: 1, page: 1, limit: 1000 });

      await service.publish('ann-001', STEWARD);

      expect(mockNotificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ recipientId: MEMBER.id }));
    });

    it('marks isCritical announcements to bypass recipient preferences on fan-out', async () => {
      mockRepo.findById.mockResolvedValue(makeAnnouncement({ isCritical: true }));
      mockRepo.updateStatus.mockResolvedValue(makeAnnouncement({ isCritical: true, status: AnnouncementStatus.PUBLISHED }));
      mockUserRepo.findAll.mockResolvedValue({ data: [{ id: 'u1' } as never], total: 1, page: 1, limit: 1000 });

      await service.publish('ann-001', ADMIN);

      expect(mockNotificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ bypassPreferences: true }));
    });
  });

  describe('findAll — audience visibility', () => {
    it('gives an Administrator the full unfiltered lifecycle listing', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [makeAnnouncement()], total: 1, page: 1, limit: 20 });
      const result = await service.findAll({}, ADMIN);
      expect(result.total).toBe(1);
      expect(mockRepo.findVisibleForUser).not.toHaveBeenCalled();
    });

    it('gives a non-administrator only their audience-visible PUBLISHED announcements', async () => {
      mockOrgMemberRepo.findByUser.mockResolvedValue([]);
      mockRelationshipRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 1000 });
      mockRepo.findVisibleForUser.mockResolvedValue({ data: [makeAnnouncement({ status: AnnouncementStatus.PUBLISHED })], total: 1, page: 1, limit: 20 });

      const result = await service.findAll({}, MEMBER);
      expect(result.total).toBe(1);
      expect(mockRepo.findAll).not.toHaveBeenCalled();
    });
  });

  describe('findById — visibility', () => {
    it('forbids viewing a DRAFT announcement outside of author/admin', async () => {
      mockRepo.findById.mockResolvedValue(makeAnnouncement());
      await expect(service.findById('ann-001', MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing announcement', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('ghost', MEMBER)).rejects.toThrow(NotFoundException);
    });

    it('allows the audience to view a PUBLISHED PLATFORM announcement', async () => {
      mockRepo.findById.mockResolvedValue(makeAnnouncement({ status: AnnouncementStatus.PUBLISHED }));
      await expect(service.findById('ann-001', MEMBER)).resolves.toBeDefined();
    });

    it('forbids a member outside a ROLE announcement\'s target role', async () => {
      mockRepo.findById.mockResolvedValue(makeAnnouncement({ scope: AnnouncementScope.ROLE, targetRole: UserRole.STEWARD, status: AnnouncementStatus.PUBLISHED }));
      await expect(service.findById('ann-001', MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('rejects editing a non-DRAFT announcement', async () => {
      mockRepo.findById.mockResolvedValue(makeAnnouncement({ status: AnnouncementStatus.PUBLISHED }));
      await expect(service.update('ann-001', { title: 'new' }, ADMIN)).rejects.toThrow(ConflictException);
    });
  });
});
