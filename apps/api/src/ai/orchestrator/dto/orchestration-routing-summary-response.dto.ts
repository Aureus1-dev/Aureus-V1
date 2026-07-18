import { ApiProperty } from '@nestjs/swagger';
import { AiOrchestrationGoal } from '@prisma/client';

export class OrchestrationGoalCountDto {
  @ApiProperty({ enum: AiOrchestrationGoal }) goal: AiOrchestrationGoal;
  @ApiProperty() count: number;
}

/** Platform-wide orchestration routing activity over the current rolling-24h window (PR-004 Founder visibility). */
export class OrchestrationRoutingSummaryResponseDto {
  @ApiProperty() runsInWindow: number;
  @ApiProperty({ type: [OrchestrationGoalCountDto] }) runsByGoal: OrchestrationGoalCountDto[];
}
