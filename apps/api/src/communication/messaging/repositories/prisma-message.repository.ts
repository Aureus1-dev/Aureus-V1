import { Injectable } from '@nestjs/common';
import { Message } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMessageInput, IMessageRepository, PaginatedMessages } from './message.repository.interface';

@Injectable()
export class PrismaMessageRepository implements IMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMessageInput): Promise<Message> {
    return this.prisma.db.message.create({ data });
  }

  async findByConversation(conversationId: string, page: number, limit: number): Promise<PaginatedMessages> {
    const where = { conversationId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.db.message.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.db.message.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<Message | null> {
    return this.prisma.db.message.findUnique({ where: { id } });
  }

  async softDelete(id: string, deletedById: string): Promise<Message> {
    return this.prisma.db.message.update({ where: { id }, data: { deletedAt: new Date(), deletedById } });
  }
}
