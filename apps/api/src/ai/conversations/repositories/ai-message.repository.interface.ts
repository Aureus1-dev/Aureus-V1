import { AiMessage, AiMessageRole } from '@prisma/client';

export const AI_MESSAGE_REPOSITORY = 'AI_MESSAGE_REPOSITORY';

export interface CreateAiMessageInput {
  conversationId: string;
  role: AiMessageRole;
  content: string;
}

export interface IAiMessageRepository {
  create(data: CreateAiMessageInput): Promise<AiMessage>;
  findByConversation(conversationId: string): Promise<AiMessage[]>;
  findRecentByConversation(conversationId: string, limit: number): Promise<AiMessage[]>;
}
