import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingStatus } from '@prisma/client';
import { IsIn, IsUUID } from 'class-validator';
import { GuidedApplicationSessionResponseDto } from '../ai/application-guide/application-guide.dto';
import { ResponsibilityResponseDto } from '../responsibilities/dto/responsibility-response.dto';

export class StartPeopleApplicationHelpDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  conversationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  opportunityId!: string;
}

export const PEOPLE_APPLICATION_OUTCOMES = [
  TrackingStatus.APPLIED,
  TrackingStatus.NOT_INTERESTED,
] as const;

export type PeopleApplicationOutcome =
  (typeof PEOPLE_APPLICATION_OUTCOMES)[number];

export class RecordPeopleApplicationOutcomeDto {
  @ApiProperty({ enum: PEOPLE_APPLICATION_OUTCOMES })
  @IsIn(PEOPLE_APPLICATION_OUTCOMES)
  outcome!: PeopleApplicationOutcome;
}

export class PeopleApplicationHelpResponseDto {
  @ApiProperty({ type: ResponsibilityResponseDto })
  responsibility!: ResponsibilityResponseDto;

  @ApiProperty({ type: GuidedApplicationSessionResponseDto })
  session!: GuidedApplicationSessionResponseDto;
}

export class ActivePeopleApplicationHelpResponseDto {
  @ApiPropertyOptional({ type: GuidedApplicationSessionResponseDto, nullable: true })
  session!: GuidedApplicationSessionResponseDto | null;

  @ApiPropertyOptional({ type: ResponsibilityResponseDto, nullable: true })
  responsibility!: ResponsibilityResponseDto | null;
}

export class CompletePeopleApplicationHelpResponseDto {
  @ApiProperty({ type: ResponsibilityResponseDto })
  responsibility!: ResponsibilityResponseDto;

  @ApiProperty({ example: true })
  ended!: true;

  @ApiProperty({ enum: PEOPLE_APPLICATION_OUTCOMES })
  outcome!: PeopleApplicationOutcome;
}

export class PausePeopleApplicationHelpResponseDto {
  @ApiProperty({ example: true })
  paused!: true;

  @ApiPropertyOptional({ type: ResponsibilityResponseDto, nullable: true })
  responsibility!: ResponsibilityResponseDto | null;
}
