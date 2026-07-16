import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Pod, PodInvitation, PodInvitationStatus, PodStatus, PodType, UserRole } from '@prisma/client';
import { PodInvitationsService } from './pod-invitations.service';
import { IPodInvitationRepository, POD_INVITATION_REPOSITORY } from './repositories/pod-invitation.repository.interface';
import { IPodRepository, POD_REPOSITORY } from '../repositories/pod.repository.interface';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };

const makePod = (o: Partial<Pod> = {}): Pod => ({
  id: 'pod-001', sequenceNumber: 1, podRef: 'AUR-POD-000001', name: 'Pod', shortDescription: 'S', fullDescription: 'F',
  type: PodType.HOME, status: PodStatus.ACTIVE, capacity: 12, primaryLanguage: null,
  city: null, region: null, stateProvince: null, country: null,
  dormancyThresholdDays: 60, parentPodId: null, createdById: 'admin', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeInvitation = (o: Partial<PodInvitation> = {}): PodInvitation => ({
  id: 'inv-001', podId: 'pod-001', invitedUserId: 'invitee-001', invitedById: STEWARD.id, message: null,
  status: PodInvitationStatus.PENDING, respondedAt: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const mockInvitationRepo: jest.Mocked<IPodInvitationRepository> = {
  create: jest.fn(), findById: jest.fn(), findForInvitee: jest.fn(), findPendingForPodAndUser: jest.fn(), update: jest.fn(),
};
const mockPodRepo: jest.Mocked<IPodRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(), findAll: jest.fn(), update: jest.fn(),
};
const mockMembershipRepo: jest.Mocked<IPodMembershipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findActiveForPodAndUser: jest.fn(),
  findPendingForPodAndUser: jest.fn(), findActiveStewardsForPod: jest.fn(), isActiveMember: jest.fn(),
  isActiveSteward: jest.fn(), countActiveForPod: jest.fn(), update: jest.fn(),
};

describe('PodInvitationsService — split-by-type (Founder Decision #3)', () => {
  let service: PodInvitationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodInvitationsService,
        PodAuthorizationService,
        { provide: POD_INVITATION_REPOSITORY, useValue: mockInvitationRepo },
        { provide: POD_REPOSITORY, useValue: mockPodRepo },
        { provide: POD_MEMBERSHIP_REPOSITORY, useValue: mockMembershipRepo },
      ],
    }).compile();
    service = m.get(PodInvitationsService);
    jest.clearAllMocks();
  });

  it('rejects a regular member inviting to a HOME Pod', async () => {
    mockPodRepo.findById.mockResolvedValue(makePod({ type: PodType.HOME }));
    mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
    await expect(service.create('pod-001', { invitedUserId: 'x' }, MEMBER)).rejects.toThrow(ForbiddenException);
  });

  it('allows this Pod\'s Steward to invite to a HOME Pod', async () => {
    mockPodRepo.findById.mockResolvedValue(makePod({ type: PodType.HOME }));
    mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
    mockInvitationRepo.findPendingForPodAndUser.mockResolvedValue(null);
    mockInvitationRepo.create.mockResolvedValue(makeInvitation());
    const result = await service.create('pod-001', { invitedUserId: 'invitee-001' }, STEWARD);
    expect(result.podId).toBe('pod-001');
  });

  it('allows any active member to invite to an INTEREST Pod', async () => {
    mockPodRepo.findById.mockResolvedValue(makePod({ type: PodType.INTEREST }));
    mockMembershipRepo.isActiveMember.mockResolvedValue(true);
    mockInvitationRepo.findPendingForPodAndUser.mockResolvedValue(null);
    mockInvitationRepo.create.mockResolvedValue(makeInvitation());
    const result = await service.create('pod-001', { invitedUserId: 'invitee-001' }, MEMBER);
    expect(result.podId).toBe('pod-001');
  });

  it('rejects a non-member inviting to an INTEREST Pod', async () => {
    mockPodRepo.findById.mockResolvedValue(makePod({ type: PodType.INTEREST }));
    mockMembershipRepo.isActiveMember.mockResolvedValue(false);
    await expect(service.create('pod-001', { invitedUserId: 'x' }, MEMBER)).rejects.toThrow(ForbiddenException);
  });

  describe('respond', () => {
    it('creates an ACTIVE membership on ACCEPT', async () => {
      mockInvitationRepo.findById.mockResolvedValue(makeInvitation({ invitedUserId: MEMBER.id }));
      mockMembershipRepo.findActiveForPodAndUser.mockResolvedValue(null);
      mockMembershipRepo.findPendingForPodAndUser.mockResolvedValue(null);
      mockMembershipRepo.create.mockResolvedValue({} as never);
      mockInvitationRepo.update.mockResolvedValue(makeInvitation({ status: PodInvitationStatus.ACCEPTED }));

      const result = await service.respond('inv-001', { decision: 'ACCEPT' }, MEMBER);

      expect(mockMembershipRepo.create).toHaveBeenCalled();
      expect(result.status).toBe(PodInvitationStatus.ACCEPTED);
    });

    it('rejects a caller responding to someone else\'s invitation', async () => {
      mockInvitationRepo.findById.mockResolvedValue(makeInvitation({ invitedUserId: 'someone-else' }));
      await expect(service.respond('inv-001', { decision: 'DECLINE' }, MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });
});
