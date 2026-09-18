import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum PeopleFollowThroughKind {
  CALLBACK = 'CALLBACK',
  APPOINTMENT = 'APPOINTMENT',
  DOCUMENT_REQUEST = 'DOCUMENT_REQUEST',
  DEADLINE = 'DEADLINE',
  WAITING = 'WAITING',
  RETRY = 'RETRY',
}

export enum PeopleFollowThroughOwner {
  AUREUS = 'AUREUS',
  MEMBER = 'MEMBER',
  HUMAN_STEWARD = 'HUMAN_STEWARD',
  THIRD_PARTY = 'THIRD_PARTY',
}

export enum PeopleFollowThroughDueProvenance {
  REPORTED = 'REPORTED',
  VERIFIED = 'VERIFIED',
}

export enum PeopleFollowThroughState {
  PENDING = 'PENDING',
  WAITING = 'WAITING',
  BLOCKED = 'BLOCKED',
  MISSED = 'MISSED',
  DISPUTED = 'DISPUTED',
  SATISFIED_REPORTED = 'SATISFIED_REPORTED',
  SATISFIED_VERIFIED = 'SATISFIED_VERIFIED',
}

export enum PeopleFollowThroughAttemptResult {
  ATTEMPTED = 'ATTEMPTED',
  NO_RESPONSE = 'NO_RESPONSE',
  RESCHEDULED = 'RESCHEDULED',
  BLOCKED = 'BLOCKED',
}

export class CreateHousingFollowThroughDto {
  @ApiProperty({ enum: PeopleFollowThroughKind })
  @IsEnum(PeopleFollowThroughKind)
  kind!: PeopleFollowThroughKind;

  @ApiProperty({ enum: PeopleFollowThroughOwner })
  @IsEnum(PeopleFollowThroughOwner)
  owner!: PeopleFollowThroughOwner;

  @ApiProperty({ description: 'The sourced condition or action that must happen.' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  requiredAction!: string;

  @ApiProperty({ description: 'Current operational due time. Member-created dates begin as REPORTED.' })
  @IsDateString()
  dueAt!: string;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  dueTimeZone!: string;

  @ApiPropertyOptional({ description: 'Why this date currently applies. It remains reported until independently verified.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  dueBasis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  consequenceIfMissed?: string;

  @ApiPropertyOptional({ description: 'What evidence would prove this obligation was actually satisfied.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  completionEvidenceRequirement?: string;
}

export class RecordFollowThroughAttemptDto {
  @ApiProperty({ enum: PeopleFollowThroughAttemptResult })
  @IsEnum(PeopleFollowThroughAttemptResult)
  result!: PeopleFollowThroughAttemptResult;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ description: 'When Aureus should follow through again, if another attempt is required.' })
  @IsOptional()
  @IsDateString()
  nextAttemptAt?: string;
}

export class ReportFollowThroughDueChangeDto {
  @ApiProperty()
  @IsDateString()
  dueAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  dueBasis?: string;
}

export class VerifyFollowThroughDueDto {
  @ApiProperty()
  @IsDateString()
  dueAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  dueBasis?: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) sourceSystem!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) sourceRecordType!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) sourceRecordId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) sourceState!: string;
}

export class ReportFollowThroughSatisfactionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class VerifyFollowThroughSatisfactionDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) sourceSystem!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) sourceRecordType!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) sourceRecordId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) sourceState!: string;
}

export class PeopleFollowThroughResponseDto {
  @ApiProperty() responsibilityId!: string;
  @ApiProperty() obligationId!: string;
  @ApiProperty({ example: 'HOUSING' }) domain!: 'HOUSING';
  @ApiProperty({ enum: PeopleFollowThroughKind }) kind!: PeopleFollowThroughKind;
  @ApiProperty({ enum: PeopleFollowThroughOwner }) owner!: PeopleFollowThroughOwner;
  @ApiProperty() requiredAction!: string;
  @ApiProperty() dueAt!: string;
  @ApiProperty() dueTimeZone!: string;
  @ApiProperty({ enum: PeopleFollowThroughDueProvenance }) dueProvenance!: PeopleFollowThroughDueProvenance;
  @ApiProperty({ enum: PeopleFollowThroughState }) state!: PeopleFollowThroughState;
  @ApiProperty() attemptCount!: number;
  @ApiPropertyOptional({ nullable: true }) nextAttemptAt!: string | null;
  @ApiProperty() reviewRequired!: boolean;
  @ApiPropertyOptional({ nullable: true }) reviewReason!: string | null;
  @ApiProperty() noActionNeededFromMember!: boolean;
}

export class AssignedFollowThroughResponseDto {
  @ApiProperty() responsibilityId!: string;
  @ApiProperty() memberId!: string;
  @ApiProperty() obligationId!: string;
  @ApiProperty({ enum: PeopleFollowThroughKind }) kind!: PeopleFollowThroughKind;
  @ApiProperty({ enum: PeopleFollowThroughOwner }) owner!: PeopleFollowThroughOwner;
  @ApiProperty() dueAt!: string;
  @ApiPropertyOptional({ nullable: true }) nextAttemptAt!: string | null;
  @ApiProperty({ enum: PeopleFollowThroughState }) state!: PeopleFollowThroughState;
  @ApiProperty() reviewRequired!: boolean;
}
