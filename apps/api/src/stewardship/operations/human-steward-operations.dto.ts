import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NeedEscalationStatus,
  StewardshipEscalationSeverity,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export enum PeopleTriageLevel {
  T0_EXPLORE = 'T0_EXPLORE',
  T1_IMPORTANT = 'T1_IMPORTANT',
  T2_FOUNDATION_RISK = 'T2_FOUNDATION_RISK',
  T3_IMMEDIATE_SAFETY = 'T3_IMMEDIATE_SAFETY',
}

export enum PeopleTriageSource {
  HUMAN_RECORDED = 'HUMAN_RECORDED',
  SYSTEM_CRISIS_SIGNAL = 'SYSTEM_CRISIS_SIGNAL',
}

export enum HumanStewardOwnershipState {
  UNASSIGNED = 'UNASSIGNED',
  ASSIGNED = 'ASSIGNED',
  CONFLICT = 'CONFLICT',
}

export enum ResponsibilityLinkState {
  LINKED = 'LINKED',
  MISSING = 'MISSING',
  AMBIGUOUS = 'AMBIGUOUS',
}

export class AssignHumanStewardDto {
  @ApiProperty()
  @IsUUID()
  stewardId!: string;
}

export class TriageHumanStewardRequestDto {
  @ApiProperty({ enum: PeopleTriageLevel })
  @IsEnum(PeopleTriageLevel)
  level!: PeopleTriageLevel;

  @ApiProperty({ description: 'Minimum private operational reason for the triage decision.' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class RequestHumanStewardHandoffDto {
  @ApiProperty({ description: 'Why another Human Steward or supervisor should take the next step.' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class ResolveHumanStewardRequestDto {
  @ApiPropertyOptional({ description: 'Operational handoff resolution note; this is not evidence that the member need resolved.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNotes?: string;
}

export class HumanStewardQueueItemDto {
  @ApiProperty() escalationId!: string;
  @ApiProperty() memberId!: string;
  @ApiProperty() statedNeedId!: string;
  @ApiProperty({ enum: NeedEscalationStatus }) status!: NeedEscalationStatus;
  @ApiPropertyOptional({ nullable: true }) reason!: string | null;

  @ApiProperty({ enum: ResponsibilityLinkState }) responsibilityLinkState!: ResponsibilityLinkState;
  @ApiPropertyOptional({ nullable: true }) responsibilityId!: string | null;

  @ApiProperty({ enum: HumanStewardOwnershipState }) ownershipState!: HumanStewardOwnershipState;
  @ApiPropertyOptional({ nullable: true }) relationshipId!: string | null;
  @ApiPropertyOptional({ nullable: true }) assignedStewardId!: string | null;

  @ApiPropertyOptional({ enum: PeopleTriageLevel, nullable: true }) triageLevel!: PeopleTriageLevel | null;
  @ApiPropertyOptional({ enum: PeopleTriageSource, nullable: true }) triageSource!: PeopleTriageSource | null;
  @ApiPropertyOptional({ nullable: true }) triageReason!: string | null;
  @ApiPropertyOptional({ enum: StewardshipEscalationSeverity, nullable: true }) triageSeverity!: StewardshipEscalationSeverity | null;
  @ApiPropertyOptional({ nullable: true }) triagedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true }) acknowledgedById!: string | null;
  @ApiPropertyOptional({ nullable: true }) acknowledgedAt!: Date | null;
  @ApiProperty() createdAt!: Date;

  @ApiProperty({ description: 'Assignment grants coordination ownership only; private data/action authority remains separately governed.' })
  authorityBoundary!: 'ASSIGNMENT_DOES_NOT_GRANT_PRIVATE_DATA_OR_ACTION_AUTHORITY';
}
