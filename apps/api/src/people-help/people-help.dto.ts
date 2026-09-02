import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingStatus } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';
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
  @IsEnum(TrackingStatus)
  outcome!: PeopleApplicationOutcome;
}

export class PeopleApplicationHelpResponseDto {
  @ApiProperty({ type: ResponsibilityResponseDto })
  responsibility!: ResponsibilityResponseDto;

  @ApiProperty({ type: GuidedApplicationSessionResponseDto })
  session!: GuidedApplicationSessionResponseDto;
}

export class ActivePeopleApplicationHelpResponseDto {
  @ApiProperty({ type: GuidedApplicationSessionResponseDto })
  session!: GuidedApplicationSessionResponseDto;

  @ApiPropertyOptional({ type: ResponsibilityResponseDto, nullable: true })
  responsibility!: ResponsibilityResponseDto | null;
}
