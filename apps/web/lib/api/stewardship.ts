import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/stewardship/relationships/dto/*` exactly
 * (FPB-009 §8). Scoped to what the Founder Operating System's Stewardship
 * Oversight panel (PR-003) needs: the platform-wide relationship roster
 * (an Administrator sees every relationship, unscoped) — not the full
 * member/steward lifecycle actions (request/assign/activate/end/reassign),
 * which have no Founder-facing surface yet.
 */
export type StewardshipRelationshipStatus = 'PENDING' | 'ACTIVE' | 'ENDED';
export type StewardshipRelationshipOrigin = 'MEMBER_REQUEST' | 'AI_RECOMMENDATION' | 'ORGANIZATION_ASSIGNMENT' | 'ADMIN_ASSIGNMENT';
export type StewardshipEndReason =
  | 'MEMBER_REQUEST' | 'STEWARD_RESIGNATION' | 'ORGANIZATION_REASSIGNMENT' | 'ADMIN_REASSIGNMENT' | 'STEWARD_INACTIVITY';

export interface StewardshipRelationshipDto {
  id: string;
  memberId: string;
  stewardId: string | null;
  status: StewardshipRelationshipStatus;
  origin: StewardshipRelationshipOrigin;
  requestedById: string | null;
  assignedById: string | null;
  assignedByOrganizationId: string | null;
  recommendedById: string | null;
  endReason: StewardshipEndReason | null;
  endedById: string | null;
  endedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedStewardshipRelationshipsDto {
  data: StewardshipRelationshipDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListStewardshipRelationshipsParams {
  page?: number;
  limit?: number;
  memberId?: string;
  stewardId?: string;
  status?: StewardshipRelationshipStatus;
}

export function listStewardshipRelationships(
  accessToken: string,
  params: ListStewardshipRelationshipsParams = {},
): Promise<PaginatedStewardshipRelationshipsDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.memberId) query.set('memberId', params.memberId);
  if (params.stewardId) query.set('stewardId', params.stewardId);
  if (params.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedStewardshipRelationshipsDto>(`/stewardship/relationships${suffix}`, { accessToken });
}

export interface StewardMetricsDto {
  stewardId: string;
  activeMemberCount: number;
  capacity: number;
  tasksCompleted: number;
  escalationsResolved: number;
  memberGoalCompletionRate: number | null;
  averageJourneyProgress: number | null;
  averageResponseTimeHours: number | null;
  memberSatisfactionScore: number | null;
  generatedAt: string;
}

export function getStewardMetrics(accessToken: string, stewardId: string): Promise<StewardMetricsDto> {
  return apiRequest<StewardMetricsDto>(`/stewardship/metrics/${stewardId}`, { accessToken });
}
