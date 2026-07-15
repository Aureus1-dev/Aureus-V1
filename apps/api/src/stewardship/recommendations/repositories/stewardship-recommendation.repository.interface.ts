import { StewardshipRecommendation, StewardshipRecommendationType } from '@prisma/client';

export const STEWARDSHIP_RECOMMENDATION_REPOSITORY = 'STEWARDSHIP_RECOMMENDATION_REPOSITORY';

export interface CreateRecommendationInput {
  relationshipId: string;
  type: StewardshipRecommendationType;
  opportunityId?: string;
  resourceId?: string;
  note?: string;
  createdById: string;
}

export interface IStewardshipRecommendationRepository {
  create(data: CreateRecommendationInput): Promise<StewardshipRecommendation>;
  findByRelationship(relationshipId: string): Promise<StewardshipRecommendation[]>;
}
