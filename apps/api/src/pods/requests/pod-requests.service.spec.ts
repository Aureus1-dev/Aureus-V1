import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Pod, PodMembership, PodMembershipOrigin, PodMembershipStatus, PodRequest, PodRequestStatus, PodRequestType, PodStatus, PodType, UserRole } from '@prisma/client';
import { PodRequestsService } from './pod-requests.service';
import { IPodRequestRepository, POD_REQUEST_REPOSITORY } from './repositories/pod-request.repository.interface';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { IPodRepository, POD_REPOSITORY } from '../repositories/pod.repository.interface';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeRequest = (o: Partial<PodRequest> = {}): PodRequest => ({
  id: 'req-001', userId: MEMBER.id, type: PodRequestType.JOIN, podId: 'pod-001',
  proposedPodName: null, proposedPodDescription: null, reason: null,
  status: PodRequestStatus.PENDING, decidedById: null, decidedAt: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeMembership = (o: Partial<PodMembership> = {}): PodMembership => ({
  id: 'mem-001', podId: 'pod-001', userId: MEMBER.id, role: 'MEMBER' as never,
  status: PodMembershipStatus.ACTIVE, origin: PodMembershipOrigin.MEMBER_REQUEST,
  invitedById: null, joinedAt: NOW, endedAt: null, endReason: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const makePod = (o: Partial<Pod> = {}): Pod => ({
  id: 'pod-001', sequenceNumber: 1, podRef: 'AUR-POD-000001', name: 'Pod', shortDescription: 'S', fullDescription: 'F',
  type: PodType.INTEREST, status: PodStatus.FORMING, capacity: 12, primaryLanguage: null,
  city: null, region: null, stateProvince: null, country: null,
  dormancyThresholdDays: 60, parentPodId: null, createdById: MEMBER.id, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRequestRepo: jest.Mocked<IPodRequestRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), update: jest.fn(),
};
const mockMembershipRepo: jest.Mocked<IPodMembershipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findActiveForPodAndUser: jest.fn(),
  findPendingForPodAndUser: jest.fn(), findActiveStewardsForPod: jest.fn(), isActiveMember: jest.fn(),
  isActiveSteward: jest.fn(), countActiveForPod: jest.fn(), update: jest.fn(),
};
const mockPodRepo: jest.Mocked<IPodRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(),
};

describe('PodRequestsService', () => {
  let service: PodRequestsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodRequestsService,
        PodAuthorizationService,
        { provide: POD_REQUEST_REPOSITORY, useValue: mockRequestRepo },
        { provide: POD_MEMBERSHIP_REPOSITORY, useValue: mockMembershipRepo },
        { provide: POD_REPOSITORY, useValue: mockPodRepo },
      ],
    }).compile();
    service = m.get(PodRequestsService);
    jest.clearAllMocks();
  });

  describe('create — LEAVE resolves immediately (Article VIII: no permission required to leave)', () => {
    it('ends the ACTIVE membership and marks the request APPROVED without a decider', async () => {
      mockMembershipRepo.findActiveForPodAndUser.mockResolvedValue(makeMembership());
      mockMembershipRepo.update.mockResolvedValue(makeMembership({ status: PodMembershipStatus.ENDED }));
      mockRequestRepo.create.mockResolvedValue(makeRequest({ type: PodRequestType.LEAVE, status: PodRequestStatus.APPROVED }));

      const result = await service.create({ type: PodRequestType.LEAVE, podId: 'pod-001' }, MEMBER);

      expect(mockMembershipRepo.update).toHaveBeenCalledWith('mem-001', expect.objectContaining({ status: PodMembershipStatus.ENDED }));
      expect(result.status).toBe(PodRequestStatus.APPROVED);
    });
  });

  describe('create — JOIN/REASSIGNMENT stay PENDING until reviewed', () => {
    it('creates a PENDING JOIN request, never auto-applied', async () => {
      mockRequestRepo.create.mockResolvedValue(makeRequest());
      const result = await service.create({ type: PodRequestType.JOIN, podId: 'pod-001' }, MEMBER);
      expect(result.status).toBe(PodRequestStatus.PENDING);
      expect(mockMembershipRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('decide', () => {
    it('rejects a decision from someone who is not the target Pod\'s Steward or Admin', async () => {
      mockRequestRepo.findById.mockResolvedValue(makeRequest());
      mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
      await expect(service.decide('req-001', { approve: true }, MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('approving JOIN activates the membership', async () => {
      mockRequestRepo.findById.mockResolvedValue(makeRequest());
      mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
      mockMembershipRepo.findPendingForPodAndUser.mockResolvedValue(null);
      mockMembershipRepo.create.mockResolvedValue(makeMembership());
      mockRequestRepo.update.mockResolvedValue(makeRequest({ status: PodRequestStatus.APPROVED, decidedById: STEWARD.id }));

      const result = await service.decide('req-001', { approve: true }, STEWARD);

      expect(mockMembershipRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: PodMembershipStatus.ACTIVE }));
      expect(result.status).toBe(PodRequestStatus.APPROVED);
    });

    it('rejects deciding an already-decided request', async () => {
      mockRequestRepo.findById.mockResolvedValue(makeRequest({ status: PodRequestStatus.APPROVED }));
      await expect(service.decide('req-001', { approve: true }, ADMIN)).rejects.toThrow(ConflictException);
    });

    it('PROPOSE_NEW_POD is Admin-only, not the target Pod\'s Steward (no target Pod exists yet)', async () => {
      mockRequestRepo.findById.mockResolvedValue(makeRequest({
        type: PodRequestType.PROPOSE_NEW_POD, podId: null,
        proposedPodName: 'New Interest Pod', proposedPodDescription: 'A community for hikers to grow together.',
      }));
      await expect(service.decide('req-001', { approve: true }, STEWARD)).rejects.toThrow(ForbiddenException);
    });

    it('approving PROPOSE_NEW_POD creates a new Pod but never auto-appoints the proposer as Steward (Founder Decision #2)', async () => {
      mockRequestRepo.findById.mockResolvedValue(makeRequest({
        type: PodRequestType.PROPOSE_NEW_POD, podId: null,
        proposedPodName: 'New Interest Pod', proposedPodDescription: 'A community for hikers to grow together.',
      }));
      mockPodRepo.create.mockResolvedValue(makePod({ podRef: null }));
      mockPodRepo.setRef.mockResolvedValue(makePod());
      mockMembershipRepo.create.mockResolvedValue(makeMembership({ role: 'MEMBER' as never }));
      mockRequestRepo.update.mockResolvedValue(makeRequest({ type: PodRequestType.PROPOSE_NEW_POD, status: PodRequestStatus.APPROVED, podId: 'pod-001' }));

      const result = await service.decide('req-001', { approve: true }, ADMIN);

      const createCall = mockMembershipRepo.create.mock.calls[0][0];
      expect(createCall.role).not.toBe('STEWARD');
      expect(result.podId).toBe('pod-001');
    });
  });

  describe('withdraw', () => {
    it('rejects withdrawing someone else\'s request', async () => {
      mockRequestRepo.findById.mockResolvedValue(makeRequest({ userId: 'someone-else' }));
      await expect(service.withdraw('req-001', MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });
});
