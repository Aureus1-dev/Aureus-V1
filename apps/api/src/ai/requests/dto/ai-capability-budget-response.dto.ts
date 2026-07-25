import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiCapability } from '@prisma/client';
import type { AiCapabilityBudget } from '@prisma/client';

export class AiCapabilityBudgetResponseDto {
  @ApiProperty({ enum: AiCapability }) capability: AiCapability;
  @ApiPropertyOptional({ nullable: true }) dailyBudgetUsd: number | null;
  @ApiPropertyOptional({ nullable: true }) dailyRequestLimit: number | null;
  @ApiPropertyOptional({ nullable: true }) updatedById: string | null;
  @ApiProperty() updatedAt: Date;

  static fromEntity(b: AiCapabilityBudget): AiCapabilityBudgetResponseDto {
    const dto = new AiCapabilityBudgetResponseDto();
    dto.capability = b.capability;
    dto.dailyBudgetUsd = b.dailyBudgetUsd;
    dto.dailyRequestLimit = b.dailyRequestLimit;
    dto.updatedById = b.updatedById;
    dto.updatedAt = b.updatedAt;
    return dto;
  }
}
