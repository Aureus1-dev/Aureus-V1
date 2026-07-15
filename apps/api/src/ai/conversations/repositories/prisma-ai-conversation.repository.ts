import { Injectable } from '@nestjs/common';
import { AiConversation } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AiConversationQueryParams,
  CreateAiConversationInput,
  IAiConversationRepository,
  PaginatedAiConversations,
} from './ai-conversation.repository.interface';

@Injectable()
export class PrismaAiConversationRepository implements IAiConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAiConversationInput): Promise<AiConversation> {
    return this.prisma.db.aiConversation.create({ data });
  }

  async findById(id: string): Promise<AiConversation | null> {
    return this.prisma.db.aiConversation.findUnique({ where: { id } });
  }

  async findAll(params: AiConversationQueryParams): Promise<PaginatedAiConversations> {
    const { page, limit, userId } = params;
    const skip = (page - 1) * limit;
    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.db.aiConversation.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' } }),
      this.prisma.db.aiConversation.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async touch(id: string): Promise<AiConversation> {
    return this.prisma.db.aiConversation.update({ where: { id }, data: { updatedAt: new Date() } });
  }
}
