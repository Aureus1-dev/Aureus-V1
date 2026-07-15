import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  ConversationType, OrganizationMemberRole, StewardshipRelationshipOrigin, StewardshipRelationshipStatus, UserRole,
} from '@prisma/client';
import { ConversationsService } from './conversations.service';
import { CONVERSATION_REPOSITORY, IConversationRepository } from './repositories/conversation.repository.interface';
import { IMessageRepository, MESSAGE_REPOSITORY } from './repositories/message.repository.interface';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../../stewardship/relationships/repositories/stewardship-relationship.repository.interface';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../../organizations/members/repositories/organization-member.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Conversation, Message, OrganizationMember, StewardshipRelationship } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const OTHER: AuthenticatedUser = { id: 'other-001', email: 'o@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeRelationship = (o: Partial<StewardshipRelationship> = {}): StewardshipRelationship => ({
  id: 'rel-001', memberId: MEMBER.id, stewardId: STEWARD.id, status: StewardshipRelationshipStatus.ACTIVE,
  origin: StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT, requestedById: null, assignedById: ADMIN.id, assignedByOrganizationId: null,
  recommendedById: null, endReason: null, endedById: null, endedAt: null, activatedAt: NOW, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeConversation = (o: Partial<Conversation> = {}): Conversation => ({
  id: 'convo-001', type: ConversationType.STEWARDSHIP, relationshipId: 'rel-001', organizationId: null,
  lastMessageAt: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeMessage = (o: Partial<Message> = {}): Message => ({
  id: 'msg-001', conversationId: 'convo-001', senderId: MEMBER.id, body: 'Hello', status: 'SENT' as never,
  createdAt: NOW, deletedAt: null, ...o,
});

const makeMembership = (o: Partial<OrganizationMember> = {}): OrganizationMember => ({
  id: 'mem-001', organizationId: 'org-001', userId: MEMBER.id, role: OrganizationMemberRole.MEMBER, createdAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IConversationRepository> = {
  create: jest.fn(), findById: jest.fn(), findByRelationshipId: jest.fn(), findOrganizationConversationBetween: jest.fn(),
  findForUser: jest.fn(), isParticipant: jest.fn(), touchLastMessageAt: jest.fn(), markRead: jest.fn(),
};
const mockMessageRepo: jest.Mocked<IMessageRepository> = {
  create: jest.fn(), findByConversation: jest.fn(),
};
const mockRelationshipRepo: jest.Mocked<IStewardshipRelationshipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), countActiveByStewardId: jest.fn(), update: jest.fn(),
};
const mockOrgMemberRepo: jest.Mocked<IOrganizationMemberRepository> = {
  add: jest.fn(), findByOrgAndUser: jest.fn(), findByOrganization: jest.fn(), findByUser: jest.fn(), countAdmins: jest.fn(), updateRole: jest.fn(), remove: jest.fn(),
};

describe('ConversationsService', () => {
  let service: ConversationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: CONVERSATION_REPOSITORY, useValue: mockRepo },
        { provide: MESSAGE_REPOSITORY, useValue: mockMessageRepo },
        { provide: STEWARDSHIP_RELATIONSHIP_REPOSITORY, useValue: mockRelationshipRepo },
        { provide: ORGANIZATION_MEMBER_REPOSITORY, useValue: mockOrgMemberRepo },
      ],
    }).compile();
    service = m.get(ConversationsService);
    jest.clearAllMocks();
  });

  describe('startStewardshipConversation', () => {
    it('creates a conversation between the member and steward of an ACTIVE relationship', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.findByRelationshipId.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeConversation());

      const result = await service.startStewardshipConversation('rel-001', MEMBER);
      expect(result.type).toBe(ConversationType.STEWARDSHIP);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ participantIds: [MEMBER.id, STEWARD.id] }));
    });

    it('is idempotent — a second call returns the same conversation without creating a duplicate', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.findByRelationshipId.mockResolvedValue(makeConversation());

      const result = await service.startStewardshipConversation('rel-001', MEMBER);
      expect(result.id).toBe('convo-001');
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('rejects starting a conversation for a non-ACTIVE relationship', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship({ status: StewardshipRelationshipStatus.PENDING }));
      await expect(service.startStewardshipConversation('rel-001', MEMBER)).rejects.toThrow(ConflictException);
    });

    it('forbids an unrelated caller from starting the conversation', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.startStewardshipConversation('rel-001', OTHER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('startOrganizationConversation', () => {
    it('creates a conversation between two representatives of the same organization', async () => {
      mockOrgMemberRepo.findByOrgAndUser.mockResolvedValueOnce(makeMembership({ userId: MEMBER.id }));
      mockOrgMemberRepo.findByOrgAndUser.mockResolvedValueOnce(makeMembership({ userId: OTHER.id }));
      mockRepo.findOrganizationConversationBetween.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeConversation({ type: ConversationType.ORGANIZATION, relationshipId: null, organizationId: 'org-001' }));

      const result = await service.startOrganizationConversation('org-001', OTHER.id, MEMBER);
      expect(result.type).toBe(ConversationType.ORGANIZATION);
    });

    it('rejects starting a conversation with yourself', async () => {
      await expect(service.startOrganizationConversation('org-001', MEMBER.id, MEMBER)).rejects.toThrow(BadRequestException);
    });

    it('forbids a caller who is not a representative of the organization', async () => {
      mockOrgMemberRepo.findByOrgAndUser.mockResolvedValueOnce(null);
      await expect(service.startOrganizationConversation('org-001', OTHER.id, MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('rejects a counterpart who is not a representative of the organization (cross-organization isolation)', async () => {
      mockOrgMemberRepo.findByOrgAndUser.mockResolvedValueOnce(makeMembership({ userId: MEMBER.id }));
      mockOrgMemberRepo.findByOrgAndUser.mockResolvedValueOnce(null);
      await expect(service.startOrganizationConversation('org-001', OTHER.id, MEMBER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendMessage / findMessages', () => {
    it('allows a participant to send a message, deriving senderId from the caller', async () => {
      mockRepo.findById.mockResolvedValue(makeConversation());
      mockRepo.isParticipant.mockResolvedValue(true);
      mockMessageRepo.create.mockResolvedValue(makeMessage());

      const result = await service.sendMessage('convo-001', { body: 'Hello' }, MEMBER);
      expect(result.senderId).toBe(MEMBER.id);
      expect(mockMessageRepo.create).toHaveBeenCalledWith(expect.objectContaining({ senderId: MEMBER.id }));
      expect(mockRepo.touchLastMessageAt).toHaveBeenCalled();
    });

    it('forbids a non-participant from sending a message', async () => {
      mockRepo.findById.mockResolvedValue(makeConversation());
      mockRepo.isParticipant.mockResolvedValue(false);
      await expect(service.sendMessage('convo-001', { body: 'Hello' }, OTHER)).rejects.toThrow(ForbiddenException);
    });

    it('forbids a non-participant from reading messages', async () => {
      mockRepo.findById.mockResolvedValue(makeConversation());
      mockRepo.isParticipant.mockResolvedValue(false);
      await expect(service.findMessages('convo-001', {}, OTHER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a nonexistent conversation', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.sendMessage('ghost', { body: 'x' }, MEMBER)).rejects.toThrow(NotFoundException);
    });

    it('allows the assigned steward to read messages in their relationship\'s conversation', async () => {
      mockRepo.findById.mockResolvedValue(makeConversation());
      mockRepo.isParticipant.mockResolvedValue(true);
      mockMessageRepo.findByConversation.mockResolvedValue({ data: [makeMessage()], total: 1, page: 1, limit: 20 });

      const result = await service.findMessages('convo-001', {}, STEWARD);
      expect(result.total).toBe(1);
    });
  });

  describe('markRead', () => {
    it('allows a participant to mark the conversation read', async () => {
      mockRepo.findById.mockResolvedValue(makeConversation());
      mockRepo.isParticipant.mockResolvedValue(true);
      await expect(service.markRead('convo-001', MEMBER)).resolves.toEqual({ success: true });
      expect(mockRepo.markRead).toHaveBeenCalledWith('convo-001', MEMBER.id, expect.any(Date));
    });
  });
});
