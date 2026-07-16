import { AiRecommendation, AiRecommendationStatus } from '@prisma/client';

export const AI_RECOMMENDATION_REPOSITORY = 'AI_RECOMMENDATION_REPOSITORY';

export interface CreateAiRecommendationInput {
  userId: string;
  opportunityId?: string;
  resourceId?: string;
  courseId?: string;
  podId?: string;
  rationale: string;
  aiRequestId?: string;
}

export interface UpdateAiRecommendationInput {
  status: AiRecommendationStatus;
  decidedAt: Date;
}

export interface AiRecommendationQueryParams {
  page: number;
  limit: number;
  userId: string;
  status?: AiRecommendationStatus;
}

export interface PaginatedAiRecommendations {
  data: AiRecommendation[];
  total: number;
  page: number;
  limit: number;
}

export interface IAiRecommendationRepository {
  create(data: CreateAiRecommendationInput): Promise<AiRecommendation>;
  findById(id: string): Promise<AiRecommendation | null>;
  findAll(params: AiRecommendationQueryParams): Promise<PaginatedAiRecommendations>;
  findExistingPending(userId: string, target: { opportunityId?: string; resourceId?: string; courseId?: string; podId?: string }): Promise<AiRecommendation | null>;
  update(id: string, data: UpdateAiRecommendationInput): Promise<AiRecommendation>;
}
