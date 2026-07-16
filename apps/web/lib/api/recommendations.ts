import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/ai/recommendations/dto/*` exactly
 * (FPB-009 §8). `generate` never auto-executes anything — `approve` is a
 * status change only, the "Aureus prepares, member approves" pattern
 * (AFX-001 §10) made concrete.
 */
export type RecommendationCategory = 'OPPORTUNITY' | 'RESOURCE' | 'COURSE' | 'POD';
export type RecommendationStatus = 'PENDING' | 'ACCEPTED' | 'DISMISSED';

export interface RecommendationDto {
  id: string;
  userId: string;
  opportunityId: string | null;
  resourceId: string | null;
  courseId: string | null;
  podId: string | null;
  rationale: string;
  status: RecommendationStatus;
  decidedAt: string | null;
  createdAt: string;
}

export interface PaginatedRecommendationsDto {
  data: RecommendationDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function generateRecommendations(
  accessToken: string,
  category: RecommendationCategory,
): Promise<RecommendationDto[]> {
  return apiRequest<RecommendationDto[]>('/ai/recommendations', {
    method: 'POST',
    accessToken,
    body: { category },
  });
}

export function listRecommendations(
  accessToken: string,
  status?: RecommendationStatus,
): Promise<PaginatedRecommendationsDto> {
  const suffix = status ? `?status=${status}` : '';
  return apiRequest<PaginatedRecommendationsDto>(`/ai/recommendations${suffix}`, { accessToken });
}

export function approveRecommendation(accessToken: string, id: string): Promise<RecommendationDto> {
  return apiRequest<RecommendationDto>(`/ai/recommendations/${id}/approve`, { method: 'POST', accessToken });
}

export function dismissRecommendation(accessToken: string, id: string): Promise<RecommendationDto> {
  return apiRequest<RecommendationDto>(`/ai/recommendations/${id}/dismiss`, { method: 'POST', accessToken });
}
