import { Injectable } from '@nestjs/common';
import { AiMessage } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAiMessageInput, IAiMessageRepository } from './ai-message.repository.interface';

@Injectable()
export class PrismaAiMessageRepository implements IAiMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAiMessageInput): Promise<AiMessage> {
    return this.prisma.db.aiMessage.create({ data });
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
