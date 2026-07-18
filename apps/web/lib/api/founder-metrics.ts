import { apiRequest } from './http';
import type { UserRole, UserStatus } from './users';

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

export interface AdministrationMetricsDto {
  totalUsers: number;
  usersByRole: RoleCountDto[];
  usersByStatus: StatusCountDto[];
  pendingVerification: PendingVerificationCountsDto;
  openEscalations: number;
  aiSpend: AiSpendSummaryDto;
  databaseHealthy: boolean;
  generatedAt: string;
}

export function getFounderMetrics(accessToken: string): Promise<AdministrationMetricsDto> {
  return apiRequest<AdministrationMetricsDto>('/administration/metrics', { accessToken });
}
