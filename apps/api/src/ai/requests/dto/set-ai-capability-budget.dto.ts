import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiCapability } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * PD-009 — either field may be set independently (or both). See
 * `AiCapabilityBudget`'s own schema comment for why: a dollar ceiling is
 * only meaningful for capabilities with an observable per-token cost;
 * Voice always logs `costUsd: 0` by architectural design, so a
 * request-count ceiling is the only lever that is real for it.
 */
export class SetAiCapabilityBudgetDto {
  @ApiProperty({ enum: AiCapability })
  @IsEnum(AiCapability)
  capability: AiCapability;

  @ApiPropertyOptional({ description: 'Daily USD ceiling for this capability, rolling 24h window' })
  @IsOptional() @IsNumber() @Min(0)
  dailyBudgetUsd?: number;

  @ApiPropertyOptional({ description: 'Daily request-count ceiling for this capability, rolling 24h window' })
  @IsOptional() @IsInt() @Min(0)
  dailyRequestLimit?: number;
}
