import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Pod, PodMemberRole, PodMembership, PodMembershipOrigin, PodMembershipStatus, PodStatus, PodType, UserRole } from '@prisma/client';
import { PodMembershipsService } from './pod-memberships.service';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from './repositories/pod-membership.repository.interface';
import { IPodRepository, POD_REPOSITORY } from '../repositories/pod.repository.interface';
import { PodMatchingService } from '../matching/pod-matching.service';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import { NotificationsService } from '../../communication/notifications/notifications.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-002', email: 'm2@example.com', roles: [UserRole.MEMBER] };
const AI: AuthenticatedUser = { id: 'ai-001', email: 'ai@example.com', roles: [UserRole.AI_SERVICE_ACCOUNT] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makePod = (o: Partial<Pod> = {}): Pod => ({
  id: 'pod-001', sequenceNumber: 1, podRef: 'AUR-POD-000001', name: 'Home Pod', shortDescription: 'S', fullDescription: 'F',
  type: PodType.HOME, status: PodStatus.ACTIVE, capacity: 12, primaryLanguage: null,
  city: null, region: null, stateProvince: null, country: null,
  dormancyThresholdDays: 60, parentPodId: null, createdById: ADMIN.id, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeMembership = (o: Partial<PodMembership> = {}): PodMembership => ({
  id: 'mem-001', podId: 'pod-001', userId: MEMBER.id, role: PodMemberRole.MEMBER,
  status: PodMembershipStatus.PENDING, origin: PodMembershipOrigin.AI_MATCH_SUGGESTION,
  invitedById: null, joinedAt: null, endedAt: null, endReason: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const mockMembershipRepo: jest.Mocked<IPodMembershipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findActiveForPodAndUser: jest.fn(),
  findPendingForPodAndUser: jest.fn(), findActiveStewardsForPod: jest.fn(), isActiveMember: jest.fn(),
  isActiveSteward: jest.fn(), countActiveForPod: jest.fn(), update: jest.fn(),
};
const mockPodRepo: jest.Mocked<IPodRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(),
};
const mockMatching = { rankCandidates: jest.fn() };
const mockNotifications = { notify: jest.fn() };

describe('PodMembershipsService', () => {
  let service: PodMembershipsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodMembershipsService,
        PodAuthorizationService,
        { provide: POD_MEMBERSHIP_REPOSITORY, useValue: mockMembershipRepo },
        { provide: POD_REPOSITORY, useValue: mockPodRepo },
        { provide: PodMatchingService, useValue: mockMatching },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = m.get(PodMembershipsService);
    jest.clearAllMocks();
  });

  describe('suggestHomePod — Founder Decision #1: proactive invitation, never assignment', () => {
    it('rejects a caller who is not an AI service account or Admin', async () => {
      await expect(service.suggestHomePod({ userId: MEMBER.id }, MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('creates a PENDING, AI_MATCH_SUGGESTION membership — never ACTIVE', async () => {
      mockMembershipRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });
      mockMatching.rankCandidates.mockResolvedValue([{ pod: makePod(), score: 5 }]);
      mockMembershipRepo.create.mockResolvedValue(makeMembership());
      mockNotifications.notify.mockResolvedValue(undefined);

      const result = await service.suggestHomePod({ userId: MEMBER.id }, AI);

      expect(mockMembershipRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        status: PodMembershipStatus.PENDING, origin: PodMembershipOrigin.AI_MATCH_SUGGESTION,
      }));
      expect(result.status).toBe(PodMembershipStatus.PENDING);
    });

    it('refuses to duplicate an existing pending/active Home Pod membership', async () => {
      mockMembershipRepo.findAll.mockResolvedValue({ data: [makeMembership({ status: PodMembershipStatus.ACTIVE })], total: 1, page: 1, limit: 50 });
      await expect(service.suggestHomePod({ userId: MEMBER.id }, AI)).rejects.toThrow(ConflictException);
    });
  });

  describe('respond — the member always decides', () => {
    it('ACCEPT moves PENDING to ACTIVE and stamps joinedAt', async () => {
      mockMembershipRepo.findById.mockResolvedValue(makeMembership());
      mockMembershipRepo.update.mockResolvedValue(makeMembership({ status: PodMembershipStatus.ACTIVE, joinedAt: NOW }));
      const result = await service.respond('mem-001', { decision: 'ACCEPT' }, MEMBER);
      expect(result.status).toBe(PodMembershipStatus.ACTIVE);
      expect(mockMembershipRepo.update).toHaveBeenCalledWith('mem-001', expect.objectContaining({ status: PodMembershipStatus.ACTIVE }));
    });

    it('DECLINE and DEFER are distinct outcomes, never ENDED', async () => {
      mockMembershipRepo.findById.mockResolvedValue(makeMembership());
      mockMembershipRepo.update.mockResolvedValue(makeMembership({ status: PodMembershipStatus.DEFERRED }));
      const result = await service.respond('mem-001', { decision: 'DEFER' }, MEMBER);
      expect(result.status).toBe(PodMembershipStatus.DEFERRED);
    });

    it('rejects a caller responding to someone else\'s invitation', async () => {
      mockMembershipRepo.findById.mockResolvedValue(makeMembership());
      await expect(service.respond('mem-001', { decision: 'ACCEPT' }, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('leave — "Belonging shall never become imprisonment" (Article VIII)', () => {
    it('ends an ACTIVE membership immediately, with no approval gate', async () => {
      mockMembershipRepo.findById.mockResolvedValue(makeMembership({ status: PodMembershipStatus.ACTIVE, userId: MEMBER.id }));
      mockMembershipRepo.update.mockResolvedValue(makeMembership({ status: PodMembershipStatus.ENDED }));
      const result = await service.leave('mem-001', MEMBER);
      expect(result.status).toBe(PodMembershipStatus.ENDED);
      expect(mockMembershipRepo.update).toHaveBeenCalledWith('mem-001', expect.objectContaining({ endReason: 'MEMBER_LEFT' }));
    });
  });

  describe('setRole — Institutional Appointment only (Founder Decision #2)', () => {
    it('rejects a non-Admin caller', async () => {
      mockMembershipRepo.findById.mockResolvedValue(makeMembership({ status: PodMembershipStatus.ACTIVE }));
      await expect(service.setRole('mem-001', { role: PodMemberRole.STEWARD }, MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('allows an Admin to appoint a Steward', async () => {
      mockMembershipRepo.findById.mockResolvedValue(makeMembership({ status: PodMembershipStatus.ACTIVE }));
      mockMembershipRepo.update.mockResolvedValue(makeMembership({ status: PodMembershipStatus.ACTIVE, role: PodMemberRole.STEWARD }));
      const result = await service.setRole('mem-001', { role: PodMemberRole.STEWARD }, ADMIN);
      expect(result.role).toBe(PodMemberRole.STEWARD);
    });
  });
});
