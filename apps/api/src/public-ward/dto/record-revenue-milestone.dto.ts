import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export enum RevenueCompletionStage {
  READY_PROJECT_VALIDATED = 'READY_PROJECT_VALIDATED',
  PROPOSAL_RECORDED = 'PROPOSAL_RECORDED',
  FOLLOW_UP_RECORDED = 'FOLLOW_UP_RECORDED',
  DECISION_RECORDED = 'DECISION_RECORDED',
  CONTRACT_RECORDED = 'CONTRACT_RECORDED',
  DEPOSIT_RECORDED = 'DEPOSIT_RECORDED',
  OPERATIONS_HANDOFF_RECORDED = 'OPERATIONS_HANDOFF_RECORDED',
}

export enum RevenueDecision {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
}

export class RecordRevenueMilestoneDto {
  @ApiProperty({ enum: RevenueCompletionStage })
  @IsEnum(RevenueCompletionStage)
  stage!: RevenueCompletionStage;

  @ApiProperty({
    description:
      'Caller-generated idempotency key for this exact reported milestone. Reusing it safely returns the existing result.',
  })
  @IsUUID()
  requestKey!: string;

  @ApiProperty({
    description:
      'Opaque, non-secret reference to the human/business/external record supporting this report. No contract text, credentials, card/bank data, or signatures.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/, {
    message: 'evidenceReference must be an opaque identifier, not free-form text',
  })
  evidenceReference!: string;

  @ApiPropertyOptional({ enum: RevenueDecision })
  @IsOptional()
  @IsEnum(RevenueDecision)
  decision?: RevenueDecision;
}
