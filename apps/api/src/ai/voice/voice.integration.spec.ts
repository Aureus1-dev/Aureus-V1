import { randomUUID } from 'crypto';
import { AiMessageRole, AiTurnEventType, VoiceSessionEndReason } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaAiConversationRepository } from '../conversations/repositories/prisma-ai-conversation.repository';
import { PrismaAiMessageRepository } from '../conversations/repositories/prisma-ai-message.repository';
import { PrismaAiVoiceSessionRepository } from './repositories/prisma-ai-voice-session.repository';
import { PrismaAiTurnEventRepository } from './repositories/prisma-ai-turn-event.repository';

/**
 * Integration test against a real PostgreSQL database (no mocks) — proves
 * the idempotency guarantees the Conversation Timing Layer and voice
 * message sync depend on actually hold under real unique-constraint
 * enforcement, not just mocked P2002 shapes, plus the real FK from
 * AiVoiceSession to AiConversation/User.
 */
describe('Voice Domain — Prisma integration', () => {
  let prisma: PrismaService;
  let conversationRepo: PrismaAiConversationRepository;
  let messageRepo: PrismaAiMessageRepository;
  let voiceSessionRepo: PrismaAiVoiceSessionRepository;
  let turnEventRepo: PrismaAiTurnEventRepository;

  const emailMarker = `integration-voice-${randomUUID()}`;
  let userId: string;
  let conversationId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    conversationRepo = new PrismaAiConversationRepository(prisma);
    messageRepo = new PrismaAiMessageRepository(prisma);
    voiceSessionRepo = new PrismaAiVoiceSessionRepository(prisma);
    turnEventRepo = new PrismaAiTurnEventRepository(prisma);

    const user = await prisma.db.user.create({ data: { email: `user-${emailMarker}@example.test` } });
    userId = user.id;
    const conversation = await conversationRepo.create({ userId });
    conversationId = conversation.id;
  });

  afterAll(async () => {
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await prisma.onModuleDestroy();
  });

  it('persists an AiVoiceSession with a real FK to AiConversation and User, and supports the active-session lookup', async () => {
    const session = await voiceSessionRepo.create({
      conversationId, userId, model: 'gpt-4o-realtime-preview', voice: 'alloy',
      turnDetectionMode: 'semantic_vad', turnDetectionConfig: { type: 'semantic_vad', eagerness: 'low' },
      providerSessionRef: null,
    });
    expect(session.conversationId).toBe(conversationId);

    const active = await voiceSessionRepo.findActiveByUser(userId);
    expect(active?.id).toBe(session.id);

    const ended = await voiceSessionRepo.end(session.id, VoiceSessionEndReason.MEMBER_ENDED);
    expect(ended.endedAt).not.toBeNull();
    expect(ended.endReason).toBe(VoiceSessionEndReason.MEMBER_ENDED);

    const noLongerActive = await voiceSessionRepo.findActiveByUser(userId);
    expect(noLongerActive).toBeNull();
  });

  it('rejects an AiVoiceSession for a nonexistent conversation (real FK enforcement)', async () => {
    await expect(
      voiceSessionRepo.create({
        conversationId: randomUUID(), userId, model: 'm', voice: 'v',
        turnDetectionMode: 'semantic_vad', turnDetectionConfig: {}, providerSessionRef: null,
      }),
    ).rejects.toThrow();
  });

  it('is idempotent on (voiceSessionId, type, providerItemId): re-delivering the same turn event does not duplicate it', async () => {
    const session = await voiceSessionRepo.create({
      conversationId, userId, model: 'm', voice: 'v', turnDetectionMode: 'semantic_vad', turnDetectionConfig: {}, providerSessionRef: null,
    });
    const providerItemId = `item-${randomUUID()}`;

    const first = await turnEventRepo.createIfNotExists({
      voiceSessionId: session.id, type: AiTurnEventType.MEMBER_TURN_FINALIZED, providerItemId, occurredAt: new Date(),
    });
    const second = await turnEventRepo.createIfNotExists({
      voiceSessionId: session.id, type: AiTurnEventType.MEMBER_TURN_FINALIZED, providerItemId, occurredAt: new Date(),
    });

    expect(second.id).toBe(first.id);
    const all = await turnEventRepo.findByVoiceSession(session.id);
    expect(all.filter((e) => e.providerItemId === providerItemId)).toHaveLength(1);
    expect(await turnEventRepo.hasFinalizedTurn(session.id, providerItemId)).toBe(true);
  });

  it('is idempotent on (voiceSessionId, providerItemId): re-syncing the same finalized message does not duplicate it', async () => {
    const session = await voiceSessionRepo.create({
      conversationId, userId, model: 'm', voice: 'v', turnDetectionMode: 'semantic_vad', turnDetectionConfig: {}, providerSessionRef: null,
    });
    const providerItemId = `item-${randomUUID()}`;

    const first = await messageRepo.createIfNotExists({
      conversationId, role: AiMessageRole.USER, content: 'Hello', voiceSessionId: session.id, providerItemId,
    });
    const second = await messageRepo.createIfNotExists({
      conversationId, role: AiMessageRole.USER, content: 'Hello', voiceSessionId: session.id, providerItemId,
    });

    expect(second.id).toBe(first.id);
    const all = await messageRepo.findByConversation(conversationId);
    expect(all.filter((m) => m.providerItemId === providerItemId)).toHaveLength(1);
  });

  it('does not let the voice unique constraint block ordinary text messages (both have null voiceSessionId/providerItemId)', async () => {
    const first = await messageRepo.create({ conversationId, role: AiMessageRole.USER, content: 'Text message one' });
    const second = await messageRepo.create({ conversationId, role: AiMessageRole.USER, content: 'Text message two' });

    expect(first.voiceSessionId).toBeNull();
    expect(second.voiceSessionId).toBeNull();
    expect(first.id).not.toBe(second.id);
  });
});
