import { ApiProperty } from '@nestjs/swagger';
import { AiCapability } from '@prisma/client';
import type { AiCapabilitySpendSummary } from '../repositories/ai-request.repository.interface';

/** Platform-wide AI spend over the current rolling-24h window, grouped by capability (PR-004 Founder visibility). */
export class AiCapabilitySpendResponseDto {
  @ApiProperty({ enum: AiCapability }) capability: AiCapability;
  @ApiProperty() totalCostUsd: number;
  @ApiProperty() requestCount: number;
  @ApiProperty() failedCount: number;

  static fromSummary(summary: AiCapabilitySpendSummary): AiCapabilitySpendResponseDto {
    const dto = new AiCapabilitySpendResponseDto();
    Object.assign(dto, summary);
    return dto;
  }
}
