import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateAiOperationalConfigDto {
  @ApiPropertyOptional({ description: 'Set true to immediately halt all AI features platform-wide' })
  @IsOptional() @IsBoolean()
  emergencyStop?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  globalDailyBudgetUsd?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  userDailyBudgetUsd?: number;
}
