import { AiVoiceSession, VoiceSessionEndReason } from '@prisma/client';

export const AI_VOICE_SESSION_REPOSITORY = 'AI_VOICE_SESSION_REPOSITORY';

export interface CreateAiVoiceSessionInput {
  conversationId: string;
  userId: string;
  model: string;
  voice: string;
  turnDetectionMode: string;
  turnDetectionConfig: object;
  providerSessionRef: string | null;
}

export interface IAiVoiceSessionRepository {
  create(data: CreateAiVoiceSessionInput): Promise<AiVoiceSession>;
  findById(id: string): Promise<AiVoiceSession | null>;
  findActiveByUser(userId: string): Promise<AiVoiceSession | null>;
  end(id: string, endReason: VoiceSessionEndReason): Promise<AiVoiceSession>;
}
