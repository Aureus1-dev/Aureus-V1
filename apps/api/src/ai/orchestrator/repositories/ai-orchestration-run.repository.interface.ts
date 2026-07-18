import { AiCapability, AiOrchestrationGoal, AiOrchestrationRun, AiOrchestrationStatus } from '@prisma/client';

export const AI_ORCHESTRATION_RUN_REPOSITORY = 'AI_ORCHESTRATION_RUN_REPOSITORY';

export interface CreateAiOrchestrationRunInput {
  userId: string;
  goal: AiOrchestrationGoal;
  capabilitiesInvoked: AiCapability[];
  outcome: string;
  status: AiOrchestrationStatus;
  latencyMs: number;
}

export interface AiOrchestrationRunQueryParams {
  page: number;
  limit: number;
  /** Omitted for the platform-wide admin listing (PR-004) — scoped for every other caller. */
  userId?: string;
  goal?: AiOrchestrationGoal;
  status?: AiOrchestrationStatus;
}

export interface PaginatedAiOrchestrationRuns {
  data: AiOrchestrationRun[];
  total: number;
  page: number;
  limit: number;
}

export interface AiOrchestrationGoalCount {
  goal: AiOrchestrationGoal;
  count: number;
}

export interface IAiOrchestrationRunRepository {
  create(data: CreateAiOrchestrationRunInput): Promise<AiOrchestrationRun>;
  findAll(params: AiOrchestrationRunQueryParams): Promise<PaginatedAiOrchestrationRuns>;

  /** Total orchestration runs created at or after `since` — backs the Founder dashboard's "today" tile. */
  countSince(since: Date): Promise<number>;

  /** Run counts grouped by goal since `since` — backs the Founder dashboard's routing-mix view. */
  countByGoalSince(since: Date): Promise<AiOrchestrationGoalCount[]>;
}
