import { ApiProperty } from '@nestjs/swagger';
import type { AiSpendSummary } from '../repositories/ai-request.repository.interface';

/** Platform-wide AI spend over the current rolling-24h ceiling window (PR-003 Founder dashboard tile). */
export class AiSpendSummaryResponseDto {
  @ApiProperty() totalCostUsd: number;
  @ApiProperty() requestCount: number;
  @ApiProperty() failedCount: number;
  @ApiProperty() globalDailyBudgetUsd: number;
  @ApiProperty() emergencyStop: boolean;

  static fromSummary(
    summary: AiSpendSummary,
    globalDailyBudgetUsd: number,
    emergencyStop: boolean,
  ): AiSpendSummaryResponseDto {
    const dto = new AiSpendSummaryResponseDto();
    dto.totalCostUsd = summary.totalCostUsd;
    dto.requestCount = summary.requestCount;
    dto.failedCount = summary.failedCount;
    dto.globalDailyBudgetUsd = globalDailyBudgetUsd;
    dto.emergencyStop = emergencyStop;
    return dto;
  }
}
