import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AiOrchestrationGoal } from '@prisma/client';

export class OrchestrateRequestDto {
  @ApiProperty({ enum: AiOrchestrationGoal })
  @IsEnum(AiOrchestrationGoal)
  goal: AiOrchestrationGoal;
}
