import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/ai/conversations/dto/*` exactly
 * (FPB-009 §8: target documented API contracts, not implementation
 * details). Do not add fields the backend does not return.
 */
export interface ConversationDto {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

/** A steward-requested interface action (DOMAIN-007 Founder Decision 1) — present only on the live response that produced it, never persisted or replayed from history. */
export interface ToolCallDto {
  id: string;
  name: string;
  arguments: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  toolCalls?: ToolCallDto[];
}

export interface PaginatedConversationsDto {
  data: ConversationDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListConversationsParams {
  page?: number;
  limit?: number;
}

export function createConversation(
  accessToken: string,
  title?: string,
): Promise<ConversationDto> {
  return apiRequest<ConversationDto>('/ai/conversations', {
    method: 'POST',
    accessToken,
    body: title ? { title } : {},
  });
}

export function listConversations(
  accessToken: string,
  params: ListConversationsParams = {},
): Promise<PaginatedConversationsDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedConversationsDto>(`/ai/conversations${suffix}`, { accessToken });
}

export function getConversation(accessToken: string, id: string): Promise<ConversationDto> {
  return apiRequest<ConversationDto>(`/ai/conversations/${id}`, { accessToken });
}

export function listMessages(accessToken: string, conversationId: string): Promise<MessageDto[]> {
  return apiRequest<MessageDto[]>(`/ai/conversations/${conversationId}/messages`, { accessToken });
}

export function sendMessage(
  accessToken: string,
  conversationId: string,
  content: string,
  interfaceContext?: string,
): Promise<MessageDto> {
  return apiRequest<MessageDto>(`/ai/conversations/${conversationId}/messages`, {
    method: 'POST',
    accessToken,
    body: interfaceContext ? { content, interfaceContext } : { content },
  });
}
