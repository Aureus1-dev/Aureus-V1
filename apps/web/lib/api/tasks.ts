import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/tasks/dto/*` exactly (FPB-009 §8).
 */
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TaskDto {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  milestoneId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PaginatedTasksDto {
  data: TaskDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function createTask(
  accessToken: string,
  milestoneId: string,
  title: string,
  priority?: TaskPriority,
): Promise<TaskDto> {
  return apiRequest<TaskDto>('/tasks', {
    method: 'POST',
    accessToken,
    body: { milestoneId, title, ...(priority ? { priority } : {}) },
  });
}

export function listTasks(accessToken: string, milestoneId: string): Promise<PaginatedTasksDto> {
  return apiRequest<PaginatedTasksDto>(`/tasks?milestoneId=${milestoneId}&limit=100`, { accessToken });
}

/**
 * The caller's own tasks across every milestone (PR-002) — omitting
 * `milestoneId` self-scopes on the backend (`TasksService.findAll`)
 * rather than requiring a specific milestone.
 */
export function listMyTasks(accessToken: string, limit = 50): Promise<PaginatedTasksDto> {
  return apiRequest<PaginatedTasksDto>(`/tasks?limit=${limit}`, { accessToken });
}

export function updateTask(accessToken: string, id: string, status: TaskStatus): Promise<TaskDto> {
  return apiRequest<TaskDto>(`/tasks/${id}`, { method: 'PATCH', accessToken, body: { status } });
}
