import { Injectable } from '@nestjs/common';
import { StewardActivityLog } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateStewardActivityLogInput,
  IStewardActivityLogRepository,
  PaginatedStewardActivityLogs,
  StewardActivityLogQueryParams,
} from './steward-activity-log.repository.interface';

@Injectable()
export class PrismaStewardActivityLogRepository implements IStewardActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateStewardActivityLogInput): Promise<StewardActivityLog> {
    return this.prisma.db.stewardActivityLog.create({ data });
  }

  async findAll(params: StewardActivityLogQueryParams): Promise<PaginatedStewardActivityLogs> {
    const { page, limit, userId, eventType } = params;
    const skip = (page - 1) * limit;
    const where = { userId, ...(eventType ? { eventType } : {}) };

    const [data, total] = await Promise.all([
      this.prisma.db.stewardActivityLog.findMany({ where, skip, take: limit, orderBy: { occurredAt: 'desc' } }),
      this.prisma.db.stewardActivityLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
