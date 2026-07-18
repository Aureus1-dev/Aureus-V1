import { Injectable } from '@nestjs/common';
import { AiRequest, AiRequestStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AiRequestQueryParams,
  AiSpendSummary,
  CreateAiRequestInput,
  IAiRequestRepository,
  PaginatedAiRequests,
} from './ai-request.repository.interface';

@Injectable()
export class PrismaAiRequestRepository implements IAiRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAiRequestInput): Promise<AiRequest> {
    return this.prisma.db.aiRequest.create({ data });
  }

  async findById(id: string): Promise<AiRequest | null> {
    return this.prisma.db.aiRequest.findUnique({ where: { id } });
  }

  async findAll(params: AiRequestQueryParams): Promise<PaginatedAiRequests> {
    const { page, limit, userId, capability, status } = params;
    const skip = (page - 1) * limit;
    const where = { ...(userId && { userId }), ...(capability && { capability }), ...(status && { status }) };

    const [data, total] = await Promise.all([
      this.prisma.db.aiRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.db.aiRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async sumCostSince(since: Date, userId?: string): Promise<number> {
    const result = await this.prisma.db.aiRequest.aggregate({
      where: { createdAt: { gte: since }, ...(userId && { userId }) },
      _sum: { costUsd: true },
    });
    return result._sum.costUsd ?? 0;
  }

  async summarySince(since: Date, userId?: string): Promise<AiSpendSummary> {
    const where = { createdAt: { gte: since }, ...(userId && { userId }) };
    const [agg, failedCount] = await Promise.all([
      this.prisma.db.aiRequest.aggregate({ where, _sum: { costUsd: true }, _count: { _all: true } }),
      this.prisma.db.aiRequest.count({ where: { ...where, status: AiRequestStatus.FAILED } }),
    ]);
    return { totalCostUsd: agg._sum.costUsd ?? 0, requestCount: agg._count._all, failedCount };
  }
}
