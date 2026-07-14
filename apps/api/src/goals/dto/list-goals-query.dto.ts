import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { GoalStatus } from '@prisma/client';

export class ListGoalsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by owner user ID' })
  @IsOptional() @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: GoalStatus })
  @IsOptional() @IsEnum(GoalStatus)
  status?: GoalStatus;
}
