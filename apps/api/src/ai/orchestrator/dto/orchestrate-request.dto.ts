import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AiOrchestrationGoal } from '@prisma/client';

export class OrchestrateRequestDto {
  @ApiProperty({ enum: AiOrchestrationGoal })
  @IsEnum(AiOrchestrationGoal)
  goal: AiOrchestrationGoal;

  @ApiPropertyOptional({
    description:
      "The caller's own StatedNeed to build a plan around. Only meaningful for COORDINATED_PLAN — " +
      'ignored by every other goal. Omitting it for COORDINATED_PLAN still returns a plan, built from ' +
      'the AI Recommendation categories alone, without a City Sheet component.',
  })
  @IsOptional()
  @IsUUID()
  needId?: string;
}
