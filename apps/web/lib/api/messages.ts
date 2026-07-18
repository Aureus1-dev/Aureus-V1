import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/communication/messaging/dto/*` exactly
 * (FPB-009 §8). Scoped to the "already have a conversation" journey
 * (PR-002): list conversations, read and send messages, mark read.
 * Starting a new conversation (`POST .../stewardship/:relationshipId`,
 * `POST .../organization/:organizationId/with/:userId`) is entry-pointed
 * from the Stewardship relationship view and the Organization
 * representative directory respectively — neither has a frontend
 * surface yet, so conversation creation remains a documented follow-up.
 */
export type ConversationType = 'STEWARDSHIP' | 'ORGANIZATION' | 'POD';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'FAILED';

export interface ConversationDto {
  id: string;
  type: ConversationType;
  relationshipId: string | null;
  organizationId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  status: MessageStatus;
  createdAt: string;
}

export interface PaginatedConversationsDto {
  data: ConversationDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedMessagesDto {
  data: MessageDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function listConversations(
  accessToken: string,
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedConversationsDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedConversationsDto>(`/communications/conversations${suffix}`, { accessToken });
}

export function getConversation(accessToken: string, id: string): Promise<ConversationDto> {
  return apiRequest<ConversationDto>(`/communications/conversations/${id}`, { accessToken });
}

export function listMessages(
  accessToken: string,
  conversationId: string,
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedMessagesDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedMessagesDto>(`/communications/conversations/${conversationId}/messages${suffix}`, { accessToken });
}

export function sendMessage(accessToken: string, conversationId: string, body: string): Promise<MessageDto> {
  return apiRequest<MessageDto>(`/communications/conversations/${conversationId}/messages`, {
    method: 'POST', accessToken, body: { body },
  });
}

export function markConversationRead(accessToken: string, conversationId: string): Promise<{ success: true }> {
  return apiRequest<{ success: true }>(`/communications/conversations/${conversationId}/read`, {
    method: 'POST', accessToken,
  });
}
