import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AiOperationalConfig } from '@prisma/client';

export class AiOperationalConfigResponseDto {
  @ApiProperty({ description: 'Kill switch — true halts all AI features platform-wide' })
  emergencyStop: boolean;
  @ApiProperty({ description: 'Platform-wide AI spend ceiling, rolling 24h window' })
  globalDailyBudgetUsd: number;
  @ApiProperty({ description: 'Per-member AI spend ceiling, rolling 24h window' })
  userDailyBudgetUsd: number;
  @ApiPropertyOptional({ nullable: true }) updatedById: string | null;
  @ApiProperty() updatedAt: Date;

  static fromEntity(c: AiOperationalConfig): AiOperationalConfigResponseDto {
    const dto = new AiOperationalConfigResponseDto();
    dto.emergencyStop = c.emergencyStop;
    dto.globalDailyBudgetUsd = c.globalDailyBudgetUsd;
    dto.userDailyBudgetUsd = c.userDailyBudgetUsd;
    dto.updatedById = c.updatedById;
    dto.updatedAt = c.updatedAt;
    return dto;
  }
}
