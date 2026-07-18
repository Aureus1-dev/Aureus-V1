import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { AiSpendSummaryResponseDto } from '../../../ai/requests/dto/ai-spend-summary-response.dto';
import { AiCapabilitySpendResponseDto } from '../../../ai/requests/dto/ai-capability-spend-response.dto';
import { OrchestrationGoalCountDto } from '../../../ai/orchestrator/dto/orchestration-routing-summary-response.dto';

export class RoleCountDto {
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() count: number;
}

export class StatusCountDto {
  @ApiProperty({ enum: UserStatus }) status: UserStatus;
  @ApiProperty() count: number;
}

/** Verification queues pending review, one count per domain (PR-003 Review Queue panel). */
export class PendingVerificationCountsDto {
  @ApiProperty() resources: number;
  @ApiProperty() organizations: number;
  @ApiProperty() opportunities: number;
  @ApiProperty() knowledgeArticles: number;
  @ApiProperty() courses: number;
  @ApiProperty() total: number;
}

/**
 * Institutional health, at a glance (PR-003 Founder Operating System
 * dashboard). Aggregates read-only counts already computed by each domain's
 * own repository — this endpoint owns no data of its own.
 */
export class AdministrationMetricsResponseDto {
  @ApiProperty() totalUsers: number;
  @ApiProperty({ type: [RoleCountDto] }) usersByRole: RoleCountDto[];
  @ApiProperty({ type: [StatusCountDto] }) usersByStatus: StatusCountDto[];
  @ApiProperty({ type: PendingVerificationCountsDto }) pendingVerification: PendingVerificationCountsDto;
  @ApiProperty({ description: 'Stewardship escalations with status OPEN or IN_PROGRESS, platform-wide' })
  openEscalations: number;
  @ApiProperty({ type: AiSpendSummaryResponseDto }) aiSpend: AiSpendSummaryResponseDto;
  @ApiProperty({ type: [AiCapabilitySpendResponseDto], description: 'PR-004 — AI spend over the same rolling-24h window, grouped by capability' })
  aiSpendByCapability: AiCapabilitySpendResponseDto[];
  @ApiProperty({ description: 'PR-004 — AI Orchestrator runs over the current rolling-24h window' })
  orchestrationRunsToday: number;
  @ApiProperty({ type: [OrchestrationGoalCountDto], description: 'PR-004 — AI Orchestrator runs over the same window, grouped by goal' })
  orchestrationRunsByGoal: OrchestrationGoalCountDto[];
  @ApiProperty({ description: 'Whether the database was reachable at the moment this report was generated' })
  databaseHealthy: boolean;
  @ApiProperty() generatedAt: Date;
}
