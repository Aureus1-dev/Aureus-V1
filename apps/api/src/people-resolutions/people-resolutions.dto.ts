import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MatchedResourceDto } from '../needs/dto/matched-resource.dto';
import { ResponsibilityResponseDto } from '../responsibilities/dto/responsibility-response.dto';

export class AcceptPersonalResolutionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  statedNeedId!: string;

  @ApiProperty({
    description: 'The outcome the member is explicitly asking Aureus to carry.',
    example: 'Keep my electricity on and restore stable service if it is interrupted.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  objective!: string;

  @ApiPropertyOptional({
    description: 'Optional member-known deadline. It never grants additional authority.',
    example: '2026-09-18T17:00:00-04:00',
  })
  @IsOptional()
  @IsISO8601()
  dueAt?: string;
}

export class RespondToResolutionResourceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  citySheetEntryId!: string;

  @ApiProperty()
  @IsBoolean()
  accepted!: boolean;
}

export class RequestHumanStewardDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ReportPersonalResolutionOutcomeDto {
  @ApiProperty({ description: 'Whether the underlying life need is now resolved.' })
  @IsBoolean()
  resolved!: boolean;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export enum PersonalResolutionRouteKind {
  VERIFIED_RESOURCE = 'VERIFIED_RESOURCE',
  HUMAN_STEWARD = 'HUMAN_STEWARD',
  CLARIFICATION = 'CLARIFICATION',
  NONE = 'NONE',
}

export class PersonalResolutionStateDto {
  @ApiProperty({ type: ResponsibilityResponseDto })
  responsibility!: ResponsibilityResponseDto;

  @ApiProperty({ format: 'uuid' })
  statedNeedId!: string;

  @ApiProperty({ enum: PersonalResolutionRouteKind })
  routeKind!: PersonalResolutionRouteKind;

  @ApiPropertyOptional({ type: MatchedResourceDto, nullable: true })
  currentResource!: MatchedResourceDto | null;

  @ApiPropertyOptional({ nullable: true })
  nextStep!: string | null;

  @ApiProperty()
  memberActionRequired!: boolean;

  @ApiProperty({
    description:
      'Plain-language statement of what the current evidence does and does not prove.',
  })
  evidenceMeaning!: string;
}
