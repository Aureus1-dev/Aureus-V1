import { Injectable } from '@nestjs/common';
import { AiOrchestrationRun } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AiOrchestrationGoalCount,
  AiOrchestrationRunQueryParams,
  CreateAiOrchestrationRunInput,
  IAiOrchestrationRunRepository,
  PaginatedAiOrchestrationRuns,
} from './ai-orchestration-run.repository.interface';

@Injectable()
export class PrismaAiOrchestrationRunRepository implements IAiOrchestrationRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAiOrchestrationRunInput): Promise<AiOrchestrationRun> {
    return this.prisma.db.aiOrchestrationRun.create({ data });
  }

  async findAll(params: AiOrchestrationRunQueryParams): Promise<PaginatedAiOrchestrationRuns> {
    const { page, limit, userId, goal, status } = params;
    const skip = (page - 1) * limit;
    const where = { ...(userId && { userId }), ...(goal && { goal }), ...(status && { status }) };

    const [data, total] = await Promise.all([
      this.prisma.db.aiOrchestrationRun.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.db.aiOrchestrationRun.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async countSince(since: Date): Promise<number> {
    return this.prisma.db.aiOrchestrationRun.count({ where: { createdAt: { gte: since } } });
  }

  async countByGoalSince(since: Date): Promise<AiOrchestrationGoalCount[]> {
    const grouped = await this.prisma.db.aiOrchestrationRun.groupBy({
      by: ['goal'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });
    return grouped.map((g) => ({ goal: g.goal, count: g._count._all }));
  }
}
