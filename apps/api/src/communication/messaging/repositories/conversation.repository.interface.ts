import { Conversation, ConversationType } from '@prisma/client';

export const CONVERSATION_REPOSITORY = 'CONVERSATION_REPOSITORY';

export interface CreateConversationInput {
  type: ConversationType;
  relationshipId?: string;
  organizationId?: string;
  participantIds: string[];
}

export interface PaginatedConversations {
  data: Conversation[];
  total: number;
  page: number;
  limit: number;
}

export interface IConversationRepository {
  create(data: CreateConversationInput): Promise<Conversation>;
  findById(id: string): Promise<Conversation | null>;
  /** Idempotent get-or-create lookup for STEWARDSHIP conversations — one thread per relationship. */
  findByRelationshipId(relationshipId: string): Promise<Conversation | null>;
  /** Idempotent get-or-create lookup for ORGANIZATION conversations between exactly two representatives. */
  findOrganizationConversationBetween(organizationId: string, userIdA: string, userIdB: string): Promise<Conversation | null>;
  findForUser(userId: string, page: number, limit: number): Promise<PaginatedConversations>;
  isParticipant(conversationId: string, userId: string): Promise<boolean>;
  touchLastMessageAt(conversationId: string, at: Date): Promise<void>;
  markRead(conversationId: string, userId: string, at: Date): Promise<void>;
}
