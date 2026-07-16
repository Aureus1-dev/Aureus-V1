import { Injectable } from '@nestjs/common';
import { AiMessage, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAiMessageInput, IAiMessageRepository } from './ai-message.repository.interface';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaAiMessageRepository implements IAiMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAiMessageInput): Promise<AiMessage> {
    return this.prisma.db.aiMessage.create({ data });
  }

  async createIfNotExists(data: CreateAiMessageInput): Promise<AiMessage> {
    try {
      return await this.prisma.db.aiMessage.create({ data });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === UNIQUE_CONSTRAINT_VIOLATION &&
        data.voiceSessionId &&
        data.providerItemId
      ) {
        const existing = await this.prisma.db.aiMessage.findUnique({
          where: {
            voiceSessionId_providerItemId: {
              voiceSessionId: data.voiceSessionId,
              providerItemId: data.providerItemId,
            },
          },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async findByConversation(conversationId: string): Promise<AiMessage[]> {
    return this.prisma.db.aiMessage.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
  }

  async findRecentByConversation(conversationId: string, limit: number): Promise<AiMessage[]> {
    const recent = await this.prisma.db.aiMessage.findMany({
      where: { conversationId }, orderBy: { createdAt: 'desc' }, take: limit,
    });
    return recent.reverse();
  }
}
