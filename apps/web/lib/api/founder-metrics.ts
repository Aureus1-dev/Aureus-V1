import { apiRequest } from './http';
import type { UserRole, UserStatus } from './users';
import type { AiCapability } from './ai-requests';

/**
 * DTO shapes mirror
 * `apps/api/src/administration/metrics/dto/administration-metrics-response.dto.ts`
 * exactly (FPB-009 §8). Institutional health, at a glance — the Founder
 * Dashboard's primary data source (PR-003).
 */
export interface RoleCountDto {
  role: UserRole;
  count: number;
}

export interface StatusCountDto {
  status: UserStatus;
  count: number;
}

export interface PendingVerificationCountsDto {
  resources: number;
  organizations: number;
  opportunities: number;
  knowledgeArticles: number;
  courses: number;
  total: number;
}

export interface AiSpendSummaryDto {
  totalCostUsd: number;
  requestCount: number;
  failedCount: number;
  globalDailyBudgetUsd: number;
  emergencyStop: boolean;
}

/** PR-004 Intelligence Layer — AI spend over the same rolling-24h window, grouped by capability. */
export interface AiCapabilitySpendDto {
  capability: AiCapability;
  totalCostUsd: number;
  requestCount: number;
  failedCount: number;
}

export type AiOrchestrationGoal =
  | 'NEXT_BEST_ACTION' | 'OPPORTUNITY_SUGGESTION' | 'RESOURCE_SUGGESTION'
  | 'JOURNEY_GUIDANCE' | 'STEWARD_ESCALATION' | 'EDUCATIONAL_RECOMMENDATION';

/** PR-004 Intelligence Layer — AI Orchestrator runs over the same rolling-24h window, grouped by goal. */
export interface OrchestrationGoalCountDto {
  goal: AiOrchestrationGoal;
  count: number;
}

export interface AdministrationMetricsDto {
  totalUsers: number;
  usersByRole: RoleCountDto[];
  usersByStatus: StatusCountDto[];
  pendingVerification: PendingVerificationCountsDto;
  openEscalations: number;
  aiSpend: AiSpendSummaryDto;
  aiSpendByCapability: AiCapabilitySpendDto[];
  orchestrationRunsToday: number;
  orchestrationRunsByGoal: OrchestrationGoalCountDto[];
  databaseHealthy: boolean;
  generatedAt: string;
}

export function getFounderMetrics(accessToken: string): Promise<AdministrationMetricsDto> {
  return apiRequest<AdministrationMetricsDto>('/administration/metrics', { accessToken });
}
