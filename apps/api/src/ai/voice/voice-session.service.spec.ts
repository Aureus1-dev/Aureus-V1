import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AiCapability,
  AiMessageCompletionStatus,
  AiProvider,
  AiRequestStatus,
  AiTurnEventType,
  UserRole,
  VoiceSessionEndReason,
} from '@prisma/client';
import type { AiConversation, AiMessage, AiTurnEvent, AiVoiceSession } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { VoiceSessionService } from './voice-session.service';
import { VOICE_PROVIDER, IVoiceProvider } from './providers/voice-provider.interface';
import { VOICE_TIMING_POLICY } from './voice-timing-policy';
import {
  AI_CONVERSATION_REPOSITORY,
  IAiConversationRepository,
} from '../conversations/repositories/ai-conversation.repository.interface';
import { AI_MESSAGE_REPOSITORY, IAiMessageRepository } from '../conversations/repositories/ai-message.repository.interface';
import { AI_REQUEST_REPOSITORY, IAiRequestRepository } from '../requests/repositories/ai-request.repository.interface';
import {
  AI_VOICE_SESSION_REPOSITORY,
  IAiVoiceSessionRepository,
} from './repositories/ai-voice-session.repository.interface';
import { AI_TURN_EVENT_REPOSITORY, IAiTurnEventRepository } from './repositories/ai-turn-event.repository.interface';

const NOW = new Date('2026-07-16T12:00:00.000Z');
const USER: AuthenticatedUser = { id: 'user-001', email: 'user@example.com', roles: [UserRole.MEMBER] };
const OTHER_USER: AuthenticatedUser = { id: 'other-001', email: 'other@example.com', roles: [UserRole.MEMBER] };

const makeConversation = (o: Partial<AiConversation> = {}): AiConversation => ({
  id: 'conv-001', userId: USER.id, title: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeVoiceSession = (o: Partial<AiVoiceSession> = {}): AiVoiceSession => ({
  id: 'vs-001',
  conversationId: 'conv-001',
  userId: USER.id,
  provider: AiProvider.OPENAI,
  model: 'gpt-4o-realtime-preview',
  voice: 'alloy',
  turnDetectionMode: VOICE_TIMING_POLICY.mode,
  turnDetectionConfig: VOICE_TIMING_POLICY.config,
  providerSessionRef: 'sess_ref_001',
  startedAt: NOW,
  endedAt: null,
  endReason: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...o,
});

const makeMessage = (o: Partial<AiMessage> = {}): AiMessage => ({
  id: 'msg-001',
  conversationId: 'conv-001',
  role: 'USER' as AiMessage['role'],
  content: 'Hello',
  createdAt: NOW,
  completionStatus: AiMessageCompletionStatus.COMPLETE,
  voiceSessionId: 'vs-001',
  providerItemId: 'item-001',
  ...o,
});

const makeTurnEvent = (o: Partial<AiTurnEvent> = {}): AiTurnEvent => ({
  id: 'te-001',
  voiceSessionId: 'vs-001',
  type: AiTurnEventType.MEMBER_TURN_FINALIZED,
  providerItemId: 'item-001',
  occurredAt: NOW,
  recordedAt: NOW,
  metadata: null,
  ...o,
});

const mockVoiceProvider: jest.Mocked<IVoiceProvider> = {
  provider: AiProvider.OPENAI,
  brokerSession: jest.fn(),
};
const mockConversationRepo: jest.Mocked<IAiConversationRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), touch: jest.fn(),
};
const mockMessageRepo: jest.Mocked<IAiMessageRepository> = {
  create: jest.fn(), createIfNotExists: jest.fn(), findByConversation: jest.fn(), findRecentByConversation: jest.fn(),
};
const mockRequestRepo: jest.Mocked<IAiRequestRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
};
const mockVoiceSessionRepo: jest.Mocked<IAiVoiceSessionRepository> = {
  create: jest.fn(), findById: jest.fn(), findActiveByUser: jest.fn(), end: jest.fn(),
};
const mockTurnEventRepo: jest.Mocked<IAiTurnEventRepository> = {
  createIfNotExists: jest.fn(), findByVoiceSession: jest.fn(), hasFinalizedTurn: jest.fn(),
};
const mockConfig = { get: jest.fn((_key: string, def?: unknown) => def) } as unknown as jest.Mocked<ConfigService>;

describe('VoiceSessionService', () => {
  let service: VoiceSessionService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        VoiceSessionService,
        { provide: VOICE_PROVIDER, useValue: mockVoiceProvider },
        { provide: AI_CONVERSATION_REPOSITORY, useValue: mockConversationRepo },
        { provide: AI_MESSAGE_REPOSITORY, useValue: mockMessageRepo },
        { provide: AI_REQUEST_REPOSITORY, useValue: mockRequestRepo },
        { provide: AI_VOICE_SESSION_REPOSITORY, useValue: mockVoiceSessionRepo },
        { provide: AI_TURN_EVENT_REPOSITORY, useValue: mockTurnEventRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = m.get(VoiceSessionService);
    jest.clearAllMocks();
    mockConfig.get.mockImplementation((_key: string, def?: unknown) => def);
    mockVoiceSessionRepo.findActiveByUser.mockResolvedValue(null);
  });

  describe('startSession', () => {
    it('creates a new conversation when none is given, then brokers and persists a session', async () => {
      mockConversationRepo.create.mockResolvedValue(makeConversation());
      mockVoiceProvider.brokerSession.mockResolvedValue({
        clientSecret: 'secret_abc', expiresAt: new Date('2026-07-16T12:30:00.000Z'), providerSessionRef: 'sess_ref_001',
      });
      mockVoiceSessionRepo.create.mockResolvedValue(makeVoiceSession());

      const result = await service.startSession({}, USER);

      expect(mockConversationRepo.create).toHaveBeenCalledWith({ userId: USER.id });
      expect(result.clientSecret).toBe('secret_abc');
      expect(result.id).toBe('vs-001');
    });

    it('reuses an existing owned conversation when conversationId is given', async () => {
      mockConversationRepo.findById.mockResolvedValue(makeConversation());
      mockVoiceProvider.brokerSession.mockResolvedValue({
        clientSecret: 'secret_abc', expiresAt: NOW, providerSessionRef: null,
      });
      mockVoiceSessionRepo.create.mockResolvedValue(makeVoiceSession());

      await service.startSession({ conversationId: 'conv-001' }, USER);

      expect(mockConversationRepo.create).not.toHaveBeenCalled();
      expect(mockVoiceSessionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ conversationId: 'conv-001' }));
    });

    it('forbids starting a session against a conversation owned by someone else', async () => {
      mockConversationRepo.findById.mockResolvedValue(makeConversation({ userId: OTHER_USER.id }));
      await expect(service.startSession({ conversationId: 'conv-001' }, USER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a nonexistent conversationId', async () => {
      mockConversationRepo.findById.mockResolvedValue(null);
      await expect(service.startSession({ conversationId: 'ghost' }, USER)).rejects.toThrow(NotFoundException);
    });

    it('injects the mandated Conversation Timing Layer policy into every brokered session, never a client-supplied one', async () => {
      mockConversationRepo.create.mockResolvedValue(makeConversation());
      mockVoiceProvider.brokerSession.mockResolvedValue({ clientSecret: 's', expiresAt: NOW, providerSessionRef: null });
      mockVoiceSessionRepo.create.mockResolvedValue(makeVoiceSession());

      await service.startSession({}, USER);

      expect(mockVoiceProvider.brokerSession).toHaveBeenCalledWith(
        expect.objectContaining({ turnDetectionConfig: VOICE_TIMING_POLICY.config }),
      );
      expect(mockVoiceSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          turnDetectionMode: VOICE_TIMING_POLICY.mode,
          turnDetectionConfig: VOICE_TIMING_POLICY.config,
        }),
      );
    });

    it('supersedes an existing active session for the same member (graceful reconnection, not a hard rejection)', async () => {
      mockConversationRepo.create.mockResolvedValue(makeConversation());
      mockVoiceSessionRepo.findActiveByUser.mockResolvedValue(makeVoiceSession({ id: 'vs-old' }));
      mockVoiceProvider.brokerSession.mockResolvedValue({ clientSecret: 's', expiresAt: NOW, providerSessionRef: null });
      mockVoiceSessionRepo.create.mockResolvedValue(makeVoiceSession({ id: 'vs-new' }));

      const result = await service.startSession({}, USER);

      expect(mockVoiceSessionRepo.end).toHaveBeenCalledWith('vs-old', VoiceSessionEndReason.RECONNECT_SUPERSEDED);
      expect(result.id).toBe('vs-new');
    });

    it('writes a SUCCESS AiRequest audit row and never persists the client secret in it', async () => {
      mockConversationRepo.create.mockResolvedValue(makeConversation());
      mockVoiceProvider.brokerSession.mockResolvedValue({ clientSecret: 'super-secret', expiresAt: NOW, providerSessionRef: null });
      mockVoiceSessionRepo.create.mockResolvedValue(makeVoiceSession());

      await service.startSession({}, USER);

      expect(mockRequestRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        capability: AiCapability.VOICE_CONVERSATION, status: AiRequestStatus.SUCCESS,
      }));
      const auditCallArgs = JSON.stringify(mockRequestRepo.create.mock.calls[0][0]);
      expect(auditCallArgs).not.toContain('super-secret');
    });

    it('audits a FAILED request and raises a safe error when the provider broker call fails', async () => {
      mockConversationRepo.create.mockResolvedValue(makeConversation());
      mockVoiceProvider.brokerSession.mockRejectedValue(new Error('upstream 500'));

      await expect(service.startSession({}, USER)).rejects.toThrow(BadRequestException);
      expect(mockRequestRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: AiRequestStatus.FAILED }));
      expect(mockVoiceSessionRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('syncEvents — Conversation Timing Layer', () => {
    it('rejects a member message with no corresponding MEMBER_TURN_FINALIZED turn event', async () => {
      mockVoiceSessionRepo.findById.mockResolvedValue(makeVoiceSession());
      mockTurnEventRepo.hasFinalizedTurn.mockResolvedValue(false);

      await expect(
        service.syncEvents('vs-001', {
          messages: [{ role: 'USER', content: 'I think maybe', providerItemId: 'item-999' }],
        }, USER),
      ).rejects.toThrow(BadRequestException);
      expect(mockMessageRepo.createIfNotExists).not.toHaveBeenCalled();
    });

    it('does not finalize a member turn merely because a pause/silence event was reported', async () => {
      mockVoiceSessionRepo.findById.mockResolvedValue(makeVoiceSession());
      mockTurnEventRepo.createIfNotExists.mockResolvedValue(makeTurnEvent({ type: AiTurnEventType.SILENCE_TIMEOUT }));
      mockTurnEventRepo.hasFinalizedTurn.mockResolvedValue(false);

      await expect(
        service.syncEvents('vs-001', {
          turnEvents: [{ type: AiTurnEventType.SILENCE_TIMEOUT, providerItemId: 'item-999', occurredAt: NOW.toISOString() }],
          messages: [{ role: 'USER', content: 'still thinking', providerItemId: 'item-999' }],
        }, USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a member message once a MEMBER_TURN_FINALIZED event backs it', async () => {
      mockVoiceSessionRepo.findById.mockResolvedValue(makeVoiceSession());
      mockTurnEventRepo.createIfNotExists.mockResolvedValue(makeTurnEvent());
      mockTurnEventRepo.hasFinalizedTurn.mockResolvedValue(true);
      mockMessageRepo.createIfNotExists.mockResolvedValue(makeMessage());

      const result = await service.syncEvents('vs-001', {
        turnEvents: [{ type: AiTurnEventType.MEMBER_TURN_FINALIZED, providerItemId: 'item-001', occurredAt: NOW.toISOString() }],
        messages: [{ role: 'USER', content: 'Hello', providerItemId: 'item-001' }],
      }, USER);

      expect(result.messages).toHaveLength(1);
      expect(mockConversationRepo.touch).toHaveBeenCalledWith('conv-001');
    });

    it('represents an interrupted steward response accurately rather than as complete', async () => {
      mockVoiceSessionRepo.findById.mockResolvedValue(makeVoiceSession());
      mockMessageRepo.createIfNotExists.mockResolvedValue(
        makeMessage({ role: 'ASSISTANT' as AiMessage['role'], completionStatus: AiMessageCompletionStatus.INTERRUPTED }),
      );

      await service.syncEvents('vs-001', {
        messages: [{
          role: 'ASSISTANT', content: 'Here is what I fou', providerItemId: 'item-002',
          completionStatus: AiMessageCompletionStatus.INTERRUPTED,
        }],
      }, USER);

      expect(mockMessageRepo.createIfNotExists).toHaveBeenCalledWith(
        expect.objectContaining({ completionStatus: AiMessageCompletionStatus.INTERRUPTED }),
      );
    });

    it('forbids syncing events for a session owned by someone else', async () => {
      mockVoiceSessionRepo.findById.mockResolvedValue(makeVoiceSession({ userId: OTHER_USER.id }));
      await expect(service.syncEvents('vs-001', {}, USER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for an unknown session id', async () => {
      mockVoiceSessionRepo.findById.mockResolvedValue(null);
      await expect(service.syncEvents('ghost', {}, USER)).rejects.toThrow(NotFoundException);
    });

    it('ends the session and rejects further sync once the duration limit has elapsed', async () => {
      const staleStart = new Date(Date.now() - 31 * 60 * 1000);
      mockVoiceSessionRepo.findById.mockResolvedValue(makeVoiceSession({ startedAt: staleStart }));

      await expect(service.syncEvents('vs-001', {}, USER)).rejects.toThrow(BadRequestException);
      expect(mockVoiceSessionRepo.end).toHaveBeenCalledWith('vs-001', VoiceSessionEndReason.DURATION_LIMIT);
    });

    it('records turn events idempotently via the repository and returns them', async () => {
      mockVoiceSessionRepo.findById.mockResolvedValue(makeVoiceSession());
      mockTurnEventRepo.createIfNotExists.mockResolvedValue(makeTurnEvent({ type: AiTurnEventType.STEWARD_RESPONSE_STARTED }));

      const result = await service.syncEvents('vs-001', {
        turnEvents: [{ type: AiTurnEventType.STEWARD_RESPONSE_STARTED, providerItemId: 'item-003', occurredAt: NOW.toISOString() }],
      }, USER);

      expect(result.turnEvents).toHaveLength(1);
      expect(mockTurnEventRepo.createIfNotExists).toHaveBeenCalledWith(expect.objectContaining({
        voiceSessionId: 'vs-001', type: AiTurnEventType.STEWARD_RESPONSE_STARTED,
      }));
    });
  });

  describe('endSession', () => {
    it('ends an active session with MEMBER_ENDED', async () => {
      mockVoiceSessionRepo.findById.mockResolvedValue(makeVoiceSession());
      mockVoiceSessionRepo.end.mockResolvedValue(makeVoiceSession({ endedAt: NOW, endReason: VoiceSessionEndReason.MEMBER_ENDED }));

      const result = await service.endSession('vs-001', USER);

      expect(mockVoiceSessionRepo.end).toHaveBeenCalledWith('vs-001', VoiceSessionEndReason.MEMBER_ENDED);
      expect(result.endReason).toBe(VoiceSessionEndReason.MEMBER_ENDED);
    });

    it('is idempotent — ending an already-ended session does not call end() again', async () => {
      mockVoiceSessionRepo.findById.mockResolvedValue(
        makeVoiceSession({ endedAt: NOW, endReason: VoiceSessionEndReason.MEMBER_ENDED }),
      );

      const result = await service.endSession('vs-001', USER);

      expect(mockVoiceSessionRepo.end).not.toHaveBeenCalled();
      expect(result.endReason).toBe(VoiceSessionEndReason.MEMBER_ENDED);
    });

    it('forbids ending a session owned by someone else', async () => {
      mockVoiceSessionRepo.findById.mockResolvedValue(makeVoiceSession({ userId: OTHER_USER.id }));
      await expect(service.endSession('vs-001', USER)).rejects.toThrow(ForbiddenException);
    });
  });
});
