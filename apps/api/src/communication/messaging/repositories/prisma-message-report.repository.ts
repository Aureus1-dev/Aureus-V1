import { Injectable } from '@nestjs/common';
import { MessageReport, MessageReportStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMessageReportInput, IMessageReportRepository } from './message-report.repository.interface';

@Injectable()
export class PrismaMessageReportRepository implements IMessageReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMessageReportInput): Promise<MessageReport> {
    return this.prisma.db.messageReport.create({ data });
  }

  async findOpen(): Promise<MessageReport[]> {
    return this.prisma.db.messageReport.findMany({
      where: { status: MessageReportStatus.OPEN },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOpenByPodId(podId: string): Promise<MessageReport[]> {
    return this.prisma.db.messageReport.findMany({
      where: { status: MessageReportStatus.OPEN, message: { conversation: { podId } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async resolve(id: string, resolvedById: string, status: MessageReportStatus): Promise<MessageReport | null> {
    try {
      return await this.prisma.db.messageReport.update({
        where: { id }, data: { status, resolvedById, resolvedAt: new Date() },
      });
    } catch {
      return null;
    }
  }
}
