import { AiMessage, AiMessageCompletionStatus, AiMessageRole } from '@prisma/client';

export const AI_MESSAGE_REPOSITORY = 'AI_MESSAGE_REPOSITORY';

export interface CreateAiMessageInput {
  conversationId: string;
  role: AiMessageRole;
  content: string;
  completionStatus?: AiMessageCompletionStatus;
  voiceSessionId?: string;
  providerItemId?: string;
}

export interface IAiMessageRepository {
  create(data: CreateAiMessageInput): Promise<AiMessage>;
  /**
   * Idempotent on (voiceSessionId, providerItemId): re-syncing the same
   * finalized voice message (client reconnect/retry) returns the existing
   * row rather than duplicating it.
   */
  createIfNotExists(data: CreateAiMessageInput): Promise<AiMessage>;
  findByConversation(conversationId: string): Promise<AiMessage[]>;
  findRecentByConversation(conversationId: string, limit: number): Promise<AiMessage[]>;
}
