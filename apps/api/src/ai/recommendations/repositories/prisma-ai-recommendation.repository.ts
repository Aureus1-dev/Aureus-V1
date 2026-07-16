import { Injectable } from '@nestjs/common';
import { AiRecommendation } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AiRecommendationQueryParams,
  CreateAiRecommendationInput,
  IAiRecommendationRepository,
  PaginatedAiRecommendations,
  UpdateAiRecommendationInput,
} from './ai-recommendation.repository.interface';

@Injectable()
export class PrismaAiRecommendationRepository implements IAiRecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAiRecommendationInput): Promise<AiRecommendation> {
    return this.prisma.db.aiRecommendation.create({ data });
  }

  async findById(id: string): Promise<AiRecommendation | null> {
    return this.prisma.db.aiRecommendation.findUnique({ where: { id } });
  }

  async findAll(params: AiRecommendationQueryParams): Promise<PaginatedAiRecommendations> {
    const { page, limit, userId, status } = params;
    const skip = (page - 1) * limit;
    const where = { userId, ...(status && { status }) };

    const [data, total] = await Promise.all([
      this.prisma.db.aiRecommendation.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.db.aiRecommendation.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findExistingPending(
    userId: string,
    target: { opportunityId?: string; resourceId?: string; courseId?: string; podId?: string },
  ): Promise<AiRecommendation | null> {
    return this.prisma.db.aiRecommendation.findFirst({
      where: {
        userId,
        status: 'PENDING',
        opportunityId: target.opportunityId ?? null,
        resourceId: target.resourceId ?? null,
        courseId: target.courseId ?? null,
        podId: target.podId ?? null,
      },
    });
  }

  async update(id: string, data: UpdateAiRecommendationInput): Promise<AiRecommendation> {
    return this.prisma.db.aiRecommendation.update({ where: { id }, data });
  }
}
