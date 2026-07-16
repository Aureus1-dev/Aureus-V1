import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiCapability, AiMessageRole, AiRequestStatus, VoiceSessionEndReason } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { VOICE_ASSISTANT_SYSTEM_PROMPT } from '../prompts/system-prompts.util';
import {
  AI_CONVERSATION_REPOSITORY,
  IAiConversationRepository,
} from '../conversations/repositories/ai-conversation.repository.interface';
import { AI_MESSAGE_REPOSITORY, IAiMessageRepository } from '../conversations/repositories/ai-message.repository.interface';
import { AI_REQUEST_REPOSITORY, IAiRequestRepository } from '../requests/repositories/ai-request.repository.interface';
import { VOICE_PROVIDER, IVoiceProvider } from './providers/voice-provider.interface';
import { VOICE_TIMING_POLICY } from './voice-timing-policy';
import {
  AI_VOICE_SESSION_REPOSITORY,
  IAiVoiceSessionRepository,
} from './repositories/ai-voice-session.repository.interface';
import { AI_TURN_EVENT_REPOSITORY, IAiTurnEventRepository } from './repositories/ai-turn-event.repository.interface';
import { StartVoiceSessionDto } from './dto/start-voice-session.dto';
import { VoiceSessionResponseDto } from './dto/voice-session-response.dto';
import { SyncVoiceEventsDto } from './dto/sync-voice-events.dto';
import { SyncVoiceEventsResponseDto, TurnEventResponseDto } from './dto/sync-voice-events-response.dto';
import { VoiceSessionStatusResponseDto } from './dto/voice-session-status-response.dto';
import { MessageResponseDto } from '../conversations/dto/message-response.dto';

const VOICE_MODEL_DEFAULT = 'gpt-4o-realtime-preview';
const VOICE_NAME_DEFAULT = 'alloy';

/**
 * Natural re-authorization checkpoint (Founder Decision 5/6): rather than a
 * scheduler/cron watching every open session, a session simply cannot be
 * synced or extended past this duration — the member re-authorizes by
 * starting a new one, which this service does gracefully (see
 * RECONNECT_SUPERSEDED below), not as an error state.
 */
const MAX_SESSION_DURATION_MS = 30 * 60 * 1000;

@Injectable()
export class VoiceSessionService {
  private readonly logger = new Logger(VoiceSessionService.name);

  constructor(
    @Inject(VOICE_PROVIDER) private readonly voiceProvider: IVoiceProvider,
    @Inject(AI_CONVERSATION_REPOSITORY) private readonly conversationRepo: IAiConversationRepository,
    @Inject(AI_MESSAGE_REPOSITORY) private readonly messageRepo: IAiMessageRepository,
    @Inject(AI_REQUEST_REPOSITORY) private readonly requestRepo: IAiRequestRepository,
    @Inject(AI_VOICE_SESSION_REPOSITORY) private readonly voiceSessionRepo: IAiVoiceSessionRepository,
    @Inject(AI_TURN_EVENT_REPOSITORY) private readonly turnEventRepo: IAiTurnEventRepository,
    private readonly config: ConfigService,
  ) {}

  /** POST /ai/voice/sessions — broker an ephemeral credential and open a session against the canonical conversation. */
  async startSession(dto: StartVoiceSessionDto, caller: AuthenticatedUser): Promise<VoiceSessionResponseDto> {
    const conversation = dto.conversationId
      ? await this.getOwnedConversationOrThrow(dto.conversationId, caller)
      : await this.conversationRepo.create({ userId: caller.id });

    // One active voice session per member (Founder concurrency policy).
    // Superseding rather than rejecting keeps reconnection graceful by
    // construction: continuity lives in AiMessage history, not provider
    // session state, so ending the stale session here is safe.
    const existingActive = await this.voiceSessionRepo.findActiveByUser(caller.id);
    if (existingActive) {
      await this.voiceSessionRepo.end(existingActive.id, VoiceSessionEndReason.RECONNECT_SUPERSEDED);
    }

    const model = this.config.get<string>('VOICE_MODEL', VOICE_MODEL_DEFAULT);
    const voice = this.config.get<string>('VOICE_NAME', VOICE_NAME_DEFAULT);
    const startedAt = Date.now();

    try {
      const broker = await this.voiceProvider.brokerSession({
        model,
        voice,
        instructions: VOICE_ASSISTANT_SYSTEM_PROMPT,
        turnDetectionConfig: VOICE_TIMING_POLICY.config,
      });

      const session = await this.voiceSessionRepo.create({
        conversationId: conversation.id,
        userId: caller.id,
        model,
        voice,
        turnDetectionMode: VOICE_TIMING_POLICY.mode,
        turnDetectionConfig: VOICE_TIMING_POLICY.config,
        providerSessionRef: broker.providerSessionRef,
      });

      await this.requestRepo.create({
        userId: caller.id,
        conversationId: conversation.id,
        capability: AiCapability.VOICE_CONVERSATION,
        provider: this.voiceProvider.provider,
        model,
        // Realtime usage happens directly between the client and the
        // provider (no backend audio proxy — Founder Decision 1), so this
        // backend has no visibility into per-token usage at broker time.
        // This row is the audit/authorization event, not a token meter.
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        latencyMs: Date.now() - startedAt,
        status: AiRequestStatus.SUCCESS,
      });

      this.logger.log(`Voice session ${session.id} started for user ${caller.id}`);
      return VoiceSessionResponseDto.fromEntity(session, broker.clientSecret, broker.expiresAt);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      await this.requestRepo.create({
        userId: caller.id,
        conversationId: conversation.id,
        capability: AiCapability.VOICE_CONVERSATION,
        provider: this.voiceProvider.provider,
        model,
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        latencyMs: Date.now() - startedAt,
        status: AiRequestStatus.FAILED,
        errorMessage,
      });

      this.logger.error(`Voice session broker failed for user ${caller.id}: ${errorMessage}`);
      throw new BadRequestException('Unable to start a voice session. Please try again shortly.');
    }
  }

  /** POST /ai/voice/sessions/:id/events — sync finalized messages and Conversation Timing Layer evidence. */
  async syncEvents(id: string, dto: SyncVoiceEventsDto, caller: AuthenticatedUser): Promise<SyncVoiceEventsResponseDto> {
    const session = await this.getOwnedSessionOrThrow(id, caller);
    await this.assertWithinDurationLimit(session);

    const persistedTurnEvents: TurnEventResponseDto[] = [];
    for (const event of dto.turnEvents ?? []) {
      const saved = await this.turnEventRepo.createIfNotExists({
        voiceSessionId: session.id,
        type: event.type,
        providerItemId: event.providerItemId,
        occurredAt: new Date(event.occurredAt),
        metadata: event.metadata,
      });
      persistedTurnEvents.push({
        id: saved.id,
        voiceSessionId: saved.voiceSessionId,
        type: saved.type,
        providerItemId: saved.providerItemId,
        occurredAt: saved.occurredAt,
      });
    }

    const persistedMessages: MessageResponseDto[] = [];
    for (const message of dto.messages ?? []) {
      if (message.role === 'USER') {
        // Conversation Timing Layer enforcement (AFX-003 §4): a member
        // turn can only be finalized on the strength of recorded timing
        // evidence, never merely because the client claims it — this is
        // what makes "a pause never finalizes a turn" a backend rule
        // rather than a client-trusted convention.
        const finalized = await this.turnEventRepo.hasFinalizedTurn(session.id, message.providerItemId);
        if (!finalized) {
          throw new BadRequestException(
            `Member message '${message.providerItemId}' has no corresponding MEMBER_TURN_FINALIZED turn event and cannot be recorded as final.`,
          );
        }
      }

      const saved = await this.messageRepo.createIfNotExists({
        conversationId: session.conversationId,
        role: message.role === 'USER' ? AiMessageRole.USER : AiMessageRole.ASSISTANT,
        content: message.content,
        completionStatus: message.completionStatus,
        voiceSessionId: session.id,
        providerItemId: message.providerItemId,
      });
      persistedMessages.push(MessageResponseDto.fromEntity(saved));
    }

    if (persistedMessages.length > 0) {
      await this.conversationRepo.touch(session.conversationId);
    }

    return { messages: persistedMessages, turnEvents: persistedTurnEvents };
  }

  /** POST /ai/voice/sessions/:id/end — explicit member-initiated end. Idempotent. */
  async endSession(id: string, caller: AuthenticatedUser): Promise<VoiceSessionStatusResponseDto> {
    const session = await this.getOwnedSessionOrThrow(id, caller);
    if (session.endedAt) return VoiceSessionStatusResponseDto.fromEntity(session);

    const ended = await this.voiceSessionRepo.end(id, VoiceSessionEndReason.MEMBER_ENDED);
    this.logger.log(`Voice session ${id} ended by member ${caller.id}`);
    return VoiceSessionStatusResponseDto.fromEntity(ended);
  }

  private async getOwnedConversationOrThrow(conversationId: string, caller: AuthenticatedUser) {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) throw new NotFoundException(`Conversation '${conversationId}' not found`);
    if (conversation.userId !== caller.id) {
      throw new ForbiddenException('You may only continue your own conversations by voice');
    }
    return conversation;
  }

  private async getOwnedSessionOrThrow(id: string, caller: AuthenticatedUser) {
    const session = await this.voiceSessionRepo.findById(id);
    if (!session) throw new NotFoundException(`Voice session '${id}' not found`);
    if (session.userId !== caller.id) {
      throw new ForbiddenException('You may only access your own voice sessions');
    }
    return session;
  }

  private async assertWithinDurationLimit(session: { id: string; startedAt: Date; endedAt: Date | null }): Promise<void> {
    if (session.endedAt) return;
    const elapsed = Date.now() - session.startedAt.getTime();
    if (elapsed > MAX_SESSION_DURATION_MS) {
      await this.voiceSessionRepo.end(session.id, VoiceSessionEndReason.DURATION_LIMIT);
      throw new BadRequestException('This voice session has exceeded its duration limit and has ended. Please start a new session.');
    }
  }
}
