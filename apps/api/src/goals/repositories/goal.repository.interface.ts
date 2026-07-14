import { Goal, GoalStatus } from '@prisma/client';

export const GOAL_REPOSITORY = 'GOAL_REPOSITORY';

export interface CreateGoalInput {
  title: string;
  userId: string;
  status?: GoalStatus;
}

export interface UpdateGoalInput {
  title?: string;
  status?: GoalStatus;
}

export interface GoalPaginationParams {
  page: number;
  limit: number;
  userId?: string;
  status?: GoalStatus;
}

export interface PaginatedGoals {
  data: Goal[];
  total: number;
  page: number;
  limit: number;
}

export interface IGoalRepository {
  create(data: CreateGoalInput): Promise<Goal>;
  findById(id: string): Promise<Goal | null>;
  findAll(params: GoalPaginationParams): Promise<PaginatedGoals>;
  update(id: string, data: UpdateGoalInput): Promise<Goal>;
  softDelete(id: string): Promise<Goal>;
}
