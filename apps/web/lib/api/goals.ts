import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/goals/dto/*` exactly (FPB-009 §8).
 */
export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export interface GoalDto {
  id: string;
  title: string;
  status: GoalStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PaginatedGoalsDto {
  data: GoalDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListGoalsParams {
  page?: number;
  limit?: number;
  status?: GoalStatus;
}

export function createGoal(accessToken: string, title: string): Promise<GoalDto> {
  return apiRequest<GoalDto>('/goals', { method: 'POST', accessToken, body: { title } });
}

export function listGoals(accessToken: string, params: ListGoalsParams = {}): Promise<PaginatedGoalsDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedGoalsDto>(`/goals${suffix}`, { accessToken });
}

export function getGoal(accessToken: string, id: string): Promise<GoalDto> {
  return apiRequest<GoalDto>(`/goals/${id}`, { accessToken });
}

export function updateGoal(accessToken: string, id: string, status: GoalStatus): Promise<GoalDto> {
  return apiRequest<GoalDto>(`/goals/${id}`, { method: 'PATCH', accessToken, body: { status } });
}
