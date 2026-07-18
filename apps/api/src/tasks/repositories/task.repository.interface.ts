import { Task, TaskPriority, TaskStatus } from '@prisma/client';

export const TASK_REPOSITORY = 'TASK_REPOSITORY';

export interface CreateTaskInput {
  title: string;
  milestoneId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
}

export interface UpdateTaskInput {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
}

export interface TaskPaginationParams {
  page: number;
  limit: number;
  milestoneId?: string;
  /** Scopes to tasks owned (transitively via Milestone → Journey → Goal) by this user — the "list my tasks across every milestone" case (PR-002). */
  userId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export interface PaginatedTasks {
  data: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface ITaskRepository {
  create(data: CreateTaskInput): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  findAll(params: TaskPaginationParams): Promise<PaginatedTasks>;
  update(id: string, data: UpdateTaskInput): Promise<Task>;
  softDelete(id: string): Promise<Task>;
  /** Resolves the owning user's ID via Milestone → Journey → Goal. Null if the task does not exist. */
  findOwnerId(id: string): Promise<string | null>;
}
