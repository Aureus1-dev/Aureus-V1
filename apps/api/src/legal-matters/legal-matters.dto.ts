import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LegalActionType,
  LegalMatterSourceKind,
  LegalMatterUrgency,
} from '@prisma/client';
import {
  Equals,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLegalMatterDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  statedNeedId!: string;

  @ApiProperty({ example: 'Help me respond to this eviction case without missing a deadline.' })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  objective!: string;

  @ApiProperty({ example: 'Pennsylvania' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  jurisdiction!: string;

  @ApiPropertyOptional({ example: 'Philadelphia Municipal Court' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  forum?: string;

  @ApiProperty({ example: 'housing / eviction' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  matterType!: string;

  @ApiProperty({ example: 'complaint received; hearing not yet held' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  proceduralPosture!: string;

  @ApiProperty({ enum: LegalMatterUrgency })
  @IsEnum(LegalMatterUrgency)
  urgency!: LegalMatterUrgency;

  @ApiProperty({
    description: 'Must be true. The member-facing product must show the steward-not-lawyer boundary before Matter creation.',
  })
  @IsBoolean()
  @Equals(true)
  disclosureAccepted!: true;

  @ApiPropertyOptional({ example: '2026-09-25T09:00:00-04:00' })
  @IsOptional()
  @IsISO8601()
  knownDeadline?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  knownDeadlineTimeZone?: string;

  @ApiPropertyOptional({ example: 'Hearing date printed on the complaint' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  knownDeadlineTrigger?: string;
}

export class AddLegalMatterSourceDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title!: string;

  @ApiProperty()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  url!: string;

  @ApiProperty({ enum: LegalMatterSourceKind })
  @IsEnum(LegalMatterSourceKind)
  kind!: LegalMatterSourceKind;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  jurisdiction!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  proposition!: string;
}

export class AddLegalMatterFactDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  statement!: string;
}

export class AddLegalMatterDeadlineDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  label!: string;

  @ApiProperty()
  @IsISO8601()
  dueAt!: string;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  timeZone!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  trigger!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  calculationBasis?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sourceId?: string;
}

export class LinkLegalMatterDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  label?: string;
}

export class RequestLegalReviewDto {
  @ApiProperty({ example: 'Please verify the official source and the hearing date before I rely on it.' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  purpose!: string;
}

export class CheckLegalActionDto {
  @ApiProperty({ enum: LegalActionType })
  @IsEnum(LegalActionType)
  actionType!: LegalActionType;
}

export class ReportLegalMatterOutcomeDto {
  @ApiProperty()
  @IsBoolean()
  resolved!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class VerifyLegalSourceIdentityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ObserveLegalFactDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sourceId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  statement!: string;
}
