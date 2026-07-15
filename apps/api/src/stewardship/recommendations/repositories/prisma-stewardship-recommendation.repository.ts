import { Injectable } from '@nestjs/common';
import { StewardshipRecommendation } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRecommendationInput, IStewardshipRecommendationRepository } from './stewardship-recommendation.repository.interface';

@Injectable()
export class PrismaStewardshipRecommendationRepository implements IStewardshipRecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRecommendationInput): Promise<StewardshipRecommendation> {
    return this.prisma.db.stewardshipRecommendation.create({ data });
  }

  async findByRelationship(relationshipId: string): Promise<StewardshipRecommendation[]> {
    return this.prisma.db.stewardshipRecommendation.findMany({
      where: { relationshipId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
