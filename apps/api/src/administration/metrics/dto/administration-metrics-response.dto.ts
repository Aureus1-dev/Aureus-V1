import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { AiSpendSummaryResponseDto } from '../../../ai/requests/dto/ai-spend-summary-response.dto';

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
  @ApiProperty({ description: 'Whether the database was reachable at the moment this report was generated' })
  databaseHealthy: boolean;
  @ApiProperty() generatedAt: Date;
}
