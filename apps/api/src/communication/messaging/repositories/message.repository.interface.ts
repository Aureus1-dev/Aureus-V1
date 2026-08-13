import { Message } from '@prisma/client';

export const MESSAGE_REPOSITORY = 'MESSAGE_REPOSITORY';

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  body: string;
}

export interface PaginatedMessages {
  data: Message[];
  total: number;
  page: number;
  limit: number;
}

export interface IMessageRepository {
  create(data: CreateMessageInput): Promise<Message>;
  findByConversation(conversationId: string, page: number, limit: number): Promise<PaginatedMessages>;
  findById(id: string): Promise<Message | null>;
  /** PD-008 — soft-delete (tombstone); already-excluded from `findByConversation` via its existing `deletedAt: null` filter. */
  softDelete(id: string, deletedById: string): Promise<Message>;
}
