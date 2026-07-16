import { AiTurnEvent, AiTurnEventType } from '@prisma/client';

export const AI_TURN_EVENT_REPOSITORY = 'AI_TURN_EVENT_REPOSITORY';

export interface CreateAiTurnEventInput {
  voiceSessionId: string;
  type: AiTurnEventType;
  providerItemId?: string;
  occurredAt: Date;
  metadata?: object;
}

export interface IAiTurnEventRepository {
  /**
   * Idempotent on (voiceSessionId, type, providerItemId): re-delivering the
   * same client-reported event returns the existing row rather than
   * duplicating it (the client may resend on reconnect/retry).
   */
  createIfNotExists(data: CreateAiTurnEventInput): Promise<AiTurnEvent>;
  findByVoiceSession(voiceSessionId: string): Promise<AiTurnEvent[]>;
  hasFinalizedTurn(voiceSessionId: string, providerItemId: string): Promise<boolean>;
}
