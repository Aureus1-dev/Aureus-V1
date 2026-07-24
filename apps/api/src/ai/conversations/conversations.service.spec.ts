import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AiCapability, AiMessageRole, UserRole } from '@prisma/client';
import { ConversationsService } from './conversations.service';
import {
  AI_CONVERSATION_REPOSITORY,
  IAiConversationRepository,
} from './repositories/ai-conversation.repository.interface';
import { AI_MESSAGE_REPOSITORY, IAiMessageRepository } from './repositories/ai-message.repository.interface';
import { AiRequestsService } from '../requests/ai-requests.service';
import { NeedsService } from '../../needs/needs.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { AiConversation, AiMessage } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const USER: AuthenticatedUser = { id: 'user-001', email: 'user@example.com', roles: [UserRole.MEMBER] };
const OTHER_USER: AuthenticatedUser = { id: 'other-001', email: 'other@example.com', roles: [UserRole.MEMBER] };

const makeConversation = (o: Partial<AiConversation> = {}): AiConversation => ({
  id: 'conv-001', userId: USER.id, title: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeMessage = (o: Partial<AiMessage> = {}): AiMessage => ({
  id: 'msg-001', conversationId: 'conv-001', role: AiMessageRole.USER, content: 'Hi', createdAt: NOW, ...o,
});

const mockConversationRepo: jest.Mocked<IAiConversationRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), touch: jest.fn(),
};
const mockMessageRepo: jest.Mocked<IAiMessageRepository> = {
  create: jest.fn(), createIfNotExists: jest.fn(), findByConversation: jest.fn(), findRecentByConversation: jest.fn(),
};
const mockAiRequests = { runCompletion: jest.fn() } as unknown as jest.Mocked<AiRequestsService>;
const mockNeeds = { capture: jest.fn(), findMine: jest.fn() } as unknown as jest.Mocked<NeedsService>;

describe('ConversationsService', () => {
  let service: ConversationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: AI_CONVERSATION_REPOSITORY, useValue: mockConversationRepo },
        { provide: AI_MESSAGE_REPOSITORY, useValue: mockMessageRepo },
        { provide: AiRequestsService, useValue: mockAiRequests },
        { provide: NeedsService, useValue: mockNeeds },
      ],
    }).compile();
    service = m.get(ConversationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a conversation owned by the caller', async () => {
      mockConversationRepo.create.mockResolvedValue(makeConversation());
      const result = await service.create({ title: 'My chat' }, USER);
      expect(mockConversationRepo.create).toHaveBeenCalledWith({ userId: USER.id, title: 'My chat' });
      expect(result.id).toBe('conv-001');
    });
  });

  describe('ownership', () => {
    it('forbids a non-owner from viewing a conversation', async () => {
      mockConversationRepo.findById.mockResolvedValue(makeConversation());
      await expect(service.findById('conv-001', OTHER_USER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing conversation', async () => {
      mockConversationRepo.findById.mockResolvedValue(null);
      await expect(service.findById('ghost', USER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('ask', () => {
    it('appends the user message, calls the AI with system prompt + history, and stores the assistant reply', async () => {
      mockConversationRepo.findById.mockResolvedValue(makeConversation());
      mockMessageRepo.create
        .mockResolvedValueOnce(makeMessage({ role: AiMessageRole.USER, content: 'What is a Journey?' }))
        .mockResolvedValueOnce(makeMessage({ id: 'msg-002', role: AiMessageRole.ASSISTANT, content: 'A Journey tracks progress toward a Goal.' }));
      mockMessageRepo.findRecentByConversation.mockResolvedValue([
        makeMessage({ role: AiMessageRole.USER, content: 'What is a Journey?' }),
      ]);
      mockAiRequests.runCompletion.mockResolvedValue({ content: 'A Journey tracks progress toward a Goal.', requestId: 'req-001' });

      const result = await service.ask('conv-001', { content: 'What is a Journey?' }, USER);

      expect(mockAiRequests.runCompletion).toHaveBeenCalledWith(expect.objectContaining({
        userId: USER.id, capability: AiCapability.QUESTION_ANSWERING, conversationId: 'conv-001',
      }));
      const callArgs = mockAiRequests.runCompletion.mock.calls[0][0];
      expect(callArgs.messages[0].role).toBe('system');
      expect(result.content).toBe('A Journey tracks progress toward a Goal.');
      expect(mockConversationRepo.touch).toHaveBeenCalledWith('conv-001');
    });

    it('forbids asking in a conversation the caller does not own', async () => {
      mockConversationRepo.findById.mockResolvedValue(makeConversation());
      await expect(service.ask('conv-001', { content: 'Hi' }, OTHER_USER)).rejects.toThrow(ForbiddenException);
    });

    describe('Gate C — C1: Understanding (stated need capture)', () => {
      it('captures the first message of a conversation as a stated need', async () => {
        mockConversationRepo.findById.mockResolvedValue(makeConversation());
        mockMessageRepo.create
          .mockResolvedValueOnce(makeMessage({ role: AiMessageRole.USER, content: 'I need help finding a job' }))
          .mockResolvedValueOnce(makeMessage({ id: 'msg-002', role: AiMessageRole.ASSISTANT, content: 'Tell me more.' }));
        mockMessageRepo.findRecentByConversation.mockResolvedValue([
          makeMessage({ role: AiMessageRole.USER, content: 'I need help finding a job' }),
        ]);
        mockAiRequests.runCompletion.mockResolvedValue({ content: 'Tell me more.', requestId: 'req-001' });

        await service.ask('conv-001', { content: 'I need help finding a job' }, USER);

        expect(mockNeeds.capture).toHaveBeenCalledWith(USER.id, 'conv-001', 'I need help finding a job');
      });

      it('does not re-capture on a later message in the same conversation', async () => {
        mockConversationRepo.findById.mockResolvedValue(makeConversation());
        mockMessageRepo.create
          .mockResolvedValueOnce(makeMessage({ role: AiMessageRole.USER, content: 'A follow-up question' }))
          .mockResolvedValueOnce(makeMessage({ id: 'msg-003', role: AiMessageRole.ASSISTANT, content: 'Sure.' }));
        mockMessageRepo.findRecentByConversation.mockResolvedValue([
          makeMessage({ role: AiMessageRole.USER, content: 'I need help finding a job' }),
          makeMessage({ id: 'msg-002', role: AiMessageRole.ASSISTANT, content: 'Tell me more.' }),
          makeMessage({ id: 'msg-003', role: AiMessageRole.USER, content: 'A follow-up question' }),
        ]);
        mockAiRequests.runCompletion.mockResolvedValue({ content: 'Sure.', requestId: 'req-002' });

        await service.ask('conv-001', { content: 'A follow-up question' }, USER);

        expect(mockNeeds.capture).not.toHaveBeenCalled();
      });

      it('never lets a capture failure block the AI response', async () => {
        mockConversationRepo.findById.mockResolvedValue(makeConversation());
        mockMessageRepo.create
          .mockResolvedValueOnce(makeMessage({ role: AiMessageRole.USER, content: 'I need help finding a job' }))
          .mockResolvedValueOnce(makeMessage({ id: 'msg-002', role: AiMessageRole.ASSISTANT, content: 'Tell me more.' }));
        mockMessageRepo.findRecentByConversation.mockResolvedValue([
          makeMessage({ role: AiMessageRole.USER, content: 'I need help finding a job' }),
        ]);
        mockAiRequests.runCompletion.mockResolvedValue({ content: 'Tell me more.', requestId: 'req-001' });
        mockNeeds.capture.mockRejectedValueOnce(new Error('db unavailable'));

        const result = await service.ask('conv-001', { content: 'I need help finding a job' }, USER);

        expect(result.content).toBe('Tell me more.');
      });
    });

    describe('Dynamic Screen Orchestration for text (DOMAIN-007)', () => {
      it('always offers the fixed interface toolset, even when no tool call results', async () => {
        mockConversationRepo.findById.mockResolvedValue(makeConversation());
        mockMessageRepo.create
          .mockResolvedValueOnce(makeMessage({ role: AiMessageRole.USER, content: 'What is a Journey?' }))
          .mockResolvedValueOnce(makeMessage({ id: 'msg-002', role: AiMessageRole.ASSISTANT, content: 'A Journey tracks progress.' }));
        mockMessageRepo.findRecentByConversation.mockResolvedValue([
          makeMessage({ role: AiMessageRole.USER, content: 'What is a Journey?' }),
        ]);
        mockAiRequests.runCompletion.mockResolvedValue({ content: 'A Journey tracks progress.', requestId: 'req-001' });

        const result = await service.ask('conv-001', { content: 'What is a Journey?' }, USER);

        const callArgs = mockAiRequests.runCompletion.mock.calls[0][0];
        expect(callArgs.tools).toEqual(
          expect.arrayContaining([expect.objectContaining({ name: 'navigate_to_route' }), expect.objectContaining({ name: 'open_panel' })]),
        );
        expect(result.toolCalls).toBeUndefined();
      });

      it('injects interfaceContext as an additive system message, never overwriting the base prompt', async () => {
        mockConversationRepo.findById.mockResolvedValue(makeConversation());
        mockMessageRepo.create
          .mockResolvedValueOnce(makeMessage({ role: AiMessageRole.USER, content: 'Show me my opportunities' }))
          .mockResolvedValueOnce(makeMessage({ id: 'msg-002', role: AiMessageRole.ASSISTANT, content: 'Here you go.' }));
        mockMessageRepo.findRecentByConversation.mockResolvedValue([
          makeMessage({ role: AiMessageRole.USER, content: 'Show me my opportunities' }),
        ]);
        mockAiRequests.runCompletion.mockResolvedValue({ content: 'Here you go.', requestId: 'req-001' });

        await service.ask(
          'conv-001',
          { content: 'Show me my opportunities', interfaceContext: 'Home.NextMission' },
          USER,
        );

        const callArgs = mockAiRequests.runCompletion.mock.calls[0][0];
        expect(callArgs.messages[0].role).toBe('system');
        expect(callArgs.messages[1]).toEqual({ role: 'system', content: "Currently visible on the member's screen: Home.NextMission" });
        expect(callArgs.messages[2].role).toBe('user');
      });

      it('surfaces tool calls the steward requested on the response, without persisting them to the message', async () => {
        mockConversationRepo.findById.mockResolvedValue(makeConversation());
        mockMessageRepo.create
          .mockResolvedValueOnce(makeMessage({ role: AiMessageRole.USER, content: 'Show me my journey' }))
          .mockResolvedValueOnce(makeMessage({ id: 'msg-002', role: AiMessageRole.ASSISTANT, content: 'Taking you there now.' }));
        mockMessageRepo.findRecentByConversation.mockResolvedValue([
          makeMessage({ role: AiMessageRole.USER, content: 'Show me my journey' }),
        ]);
        mockAiRequests.runCompletion.mockResolvedValue({
          content: 'Taking you there now.',
          requestId: 'req-001',
          toolCalls: [{ id: 'call-1', name: 'navigate_to_route', arguments: '{"route":"journey"}' }],
        });

        const result = await service.ask('conv-001', { content: 'Show me my journey' }, USER);

        expect(result.toolCalls).toEqual([{ id: 'call-1', name: 'navigate_to_route', arguments: '{"route":"journey"}' }]);
        expect(mockMessageRepo.create).toHaveBeenLastCalledWith({
          conversationId: 'conv-001', role: AiMessageRole.ASSISTANT, content: 'Taking you there now.',
        });
      });
    });
  });
});
