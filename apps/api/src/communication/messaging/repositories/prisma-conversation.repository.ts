import { Injectable } from '@nestjs/common';
import { Conversation, ConversationType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateConversationInput,
  IConversationRepository,
  PaginatedConversations,
} from './conversation.repository.interface';

@Injectable()
export class PrismaConversationRepository implements IConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateConversationInput): Promise<Conversation> {
    const conversation = await this.prisma.db.conversation.create({
      data: { type: data.type, relationshipId: data.relationshipId, organizationId: data.organizationId },
    });
    await this.prisma.db.conversationParticipant.createMany({
      data: data.participantIds.map((userId) => ({ conversationId: conversation.id, userId })),
    });
    return conversation;
  }

  async findById(id: string): Promise<Conversation | null> {
    return this.prisma.db.conversation.findUnique({ where: { id } });
  }

  async findByRelationshipId(relationshipId: string): Promise<Conversation | null> {
    return this.prisma.db.conversation.findUnique({ where: { relationshipId } });
  }

  async findOrganizationConversationBetween(organizationId: string, userIdA: string, userIdB: string): Promise<Conversation | null> {
    return this.prisma.db.conversation.findFirst({
      where: {
        type: ConversationType.ORGANIZATION,
        organizationId,
        AND: [
          { participants: { some: { userId: userIdA } } },
          { participants: { some: { userId: userIdB } } },
        ],
      },
    });
  }

  async findForUser(userId: string, page: number, limit: number): Promise<PaginatedConversations> {
    const where = { participants: { some: { userId } } };
    const [data, total] = await Promise.all([
      this.prisma.db.conversation.findMany({
        where, orderBy: { lastMessageAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.db.conversation.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.db.conversationParticipant.count({ where: { conversationId, userId } });
    return count > 0;
  }

  async touchLastMessageAt(conversationId: string, at: Date): Promise<void> {
    await this.prisma.db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: at } });
  }

  async markRead(conversationId: string, userId: string, at: Date): Promise<void> {
    await this.prisma.db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: at },
    });
  }
}
