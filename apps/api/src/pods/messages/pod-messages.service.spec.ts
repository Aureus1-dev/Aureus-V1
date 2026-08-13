import { Test } from '@nestjs/testing';
import { PodMembershipStatus, UserRole } from '@prisma/client';
import { PodMessagesService } from './pod-messages.service';
import { ConversationsService } from '../../communication/messaging/conversations.service';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };

const mockMembershipRepo: jest.Mocked<IPodMembershipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findActiveForPodAndUser: jest.fn(),
  findPendingForPodAndUser: jest.fn(), findActiveStewardsForPod: jest.fn(), isActiveMember: jest.fn(),
  isActiveSteward: jest.fn(), countActiveForPod: jest.fn(), update: jest.fn(),
};

const mockConversations = {
  startPodConversation: jest.fn(),
  moderatorDeleteMessage: jest.fn(),
  findReportsForPod: jest.fn(),
} as unknown as jest.Mocked<ConversationsService>;

describe('PodMessagesService', () => {
  let service: PodMessagesService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodMessagesService,
        PodAuthorizationService,
        { provide: POD_MEMBERSHIP_REPOSITORY, useValue: mockMembershipRepo },
        { provide: ConversationsService, useValue: mockConversations },
      ],
    }).compile();
    service = m.get(PodMessagesService);
    jest.clearAllMocks();
  });

  describe('startOrGetConversation', () => {
    it('resolves the ACTIVE roster and delegates to ConversationsService.startPodConversation', async () => {
      mockMembershipRepo.findAll.mockResolvedValue({
        data: [{ userId: MEMBER.id } as never, { userId: STEWARD.id } as never], total: 2, page: 1, limit: 200,
      });
      mockConversations.startPodConversation.mockResolvedValue({ id: 'convo-001' } as never);

      await service.startOrGetConversation('pod-001', MEMBER);

      expect(mockMembershipRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ podId: 'pod-001', status: PodMembershipStatus.ACTIVE }),
      );
      expect(mockConversations.startPodConversation).toHaveBeenCalledWith('pod-001', [MEMBER.id, STEWARD.id], MEMBER);
    });
  });

  describe('deleteAnyMessage (PD-008)', () => {
    it('allows this Pod\'s Steward to remove any message, delegating to the trusted-caller moderatorDeleteMessage', async () => {
      mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
      mockMembershipRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 });
      mockConversations.startPodConversation.mockResolvedValue({ id: 'convo-001' } as never);
      mockConversations.moderatorDeleteMessage.mockResolvedValue({ id: 'msg-001', deleted: true } as never);

      const result = await service.deleteAnyMessage('pod-001', 'msg-001', STEWARD);

      expect(mockConversations.moderatorDeleteMessage).toHaveBeenCalledWith('convo-001', 'msg-001', STEWARD.id);
      expect(result.deleted).toBe(true);
    });

    it('allows a Platform Administrator to remove any message', async () => {
      mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
      mockMembershipRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 });
      mockConversations.startPodConversation.mockResolvedValue({ id: 'convo-001' } as never);
      mockConversations.moderatorDeleteMessage.mockResolvedValue({ id: 'msg-001', deleted: true } as never);

      await service.deleteAnyMessage('pod-001', 'msg-001', ADMIN);
      expect(mockConversations.moderatorDeleteMessage).toHaveBeenCalledWith('convo-001', 'msg-001', ADMIN.id);
    });

    it('forbids an ordinary member (not this Pod\'s Steward) from removing another member\'s message', async () => {
      mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
      await expect(service.deleteAnyMessage('pod-001', 'msg-001', MEMBER)).rejects.toThrow();
      expect(mockConversations.moderatorDeleteMessage).not.toHaveBeenCalled();
    });
  });

  describe('listReports (PD-008)', () => {
    it('allows this Pod\'s Steward to view this Pod\'s reported-content queue', async () => {
      mockMembershipRepo.isActiveSteward.mockResolvedValue(true);
      mockConversations.findReportsForPod.mockResolvedValue([]);

      await service.listReports('pod-001', STEWARD);
      expect(mockConversations.findReportsForPod).toHaveBeenCalledWith('pod-001');
    });

    it('forbids an ordinary member from viewing the reported-content queue', async () => {
      mockMembershipRepo.isActiveSteward.mockResolvedValue(false);
      await expect(service.listReports('pod-001', MEMBER)).rejects.toThrow();
      expect(mockConversations.findReportsForPod).not.toHaveBeenCalled();
    });
  });
});
