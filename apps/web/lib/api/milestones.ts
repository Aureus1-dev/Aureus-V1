import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/milestones/dto/*` exactly (FPB-009 §8).
 */
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface MilestoneDto {
  id: string;
  title: string;
  status: MilestoneStatus;
  position: number;
  journeyId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PaginatedMilestonesDto {
  data: MilestoneDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function createMilestone(
  accessToken: string,
  journeyId: string,
  title: string,
  position?: number,
): Promise<MilestoneDto> {
  return apiRequest<MilestoneDto>('/milestones', {
    method: 'POST',
    accessToken,
    body: { journeyId, title, ...(position !== undefined ? { position } : {}) },
  });
}

export function listMilestones(accessToken: string, journeyId: string): Promise<PaginatedMilestonesDto> {
  return apiRequest<PaginatedMilestonesDto>(`/milestones?journeyId=${journeyId}&limit=100`, { accessToken });
}

export function updateMilestone(
  accessToken: string,
  id: string,
  status: MilestoneStatus,
): Promise<MilestoneDto> {
  return apiRequest<MilestoneDto>(`/milestones/${id}`, { method: 'PATCH', accessToken, body: { status } });
}
