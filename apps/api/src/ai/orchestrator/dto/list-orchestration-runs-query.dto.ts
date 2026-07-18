import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AiOrchestrationGoal, AiOrchestrationStatus } from '@prisma/client';

export class ListOrchestrationRunsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: AiOrchestrationGoal })
  @IsOptional() @IsEnum(AiOrchestrationGoal)
  goal?: AiOrchestrationGoal;

  @ApiPropertyOptional({ enum: AiOrchestrationStatus, description: 'Admin platform-wide listing only' })
  @IsOptional() @IsEnum(AiOrchestrationStatus)
  status?: AiOrchestrationStatus;

  @ApiPropertyOptional({ description: 'Admin platform-wide listing only — filter to one member' })
  @IsOptional() @IsUUID()
  userId?: string;
}
