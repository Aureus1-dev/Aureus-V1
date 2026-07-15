import { AiConversation } from '@prisma/client';

export const AI_CONVERSATION_REPOSITORY = 'AI_CONVERSATION_REPOSITORY';

export interface CreateAiConversationInput {
  userId: string;
  title?: string;
}

export interface AiConversationQueryParams {
  page: number;
  limit: number;
  userId: string;
}

export interface PaginatedAiConversations {
  data: AiConversation[];
  total: number;
  page: number;
  limit: number;
}

export interface IAiConversationRepository {
  create(data: CreateAiConversationInput): Promise<AiConversation>;
  findById(id: string): Promise<AiConversation | null>;
  findAll(params: AiConversationQueryParams): Promise<PaginatedAiConversations>;
  touch(id: string): Promise<AiConversation>;
}
