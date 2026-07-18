import { ApiProperty } from '@nestjs/swagger';
import { AiCapability, AiOrchestrationGoal, AiOrchestrationStatus } from '@prisma/client';
import type { AiOrchestrationRun } from '@prisma/client';

export class OrchestrationRunResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: AiOrchestrationGoal }) goal: AiOrchestrationGoal;
  @ApiProperty({ enum: AiCapability, isArray: true }) capabilitiesInvoked: AiCapability[];
  @ApiProperty() outcome: string;
  @ApiProperty({ enum: AiOrchestrationStatus }) status: AiOrchestrationStatus;
  @ApiProperty() latencyMs: number;
  @ApiProperty() createdAt: Date;

  static fromEntity(r: AiOrchestrationRun): OrchestrationRunResponseDto {
    const dto = new OrchestrationRunResponseDto();
    Object.assign(dto, r);
    return dto;
  }
}
