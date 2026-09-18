import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceVerificationResult } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateEvidenceRequirementDto {
  @ApiProperty({ example: 'Proof of current address' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  label!: string;

  @ApiProperty({
    example:
      'Housing assistance eligibility requires a current, dated proof of address in the applicant name.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({
    description:
      'Evidence satisfying this requirement is stale after this many days from its validFrom/submission.',
    example: 90,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  requiredValidityDays?: number;
}

export class WaiveEvidenceRequirementDto {
  @ApiProperty({
    example: 'Member is currently unhoused; this requirement does not apply to this case.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

// Exactly one of documentId / externalSourceRef must be supplied — enforced in
// the service layer (mirrors LegalMatter's discriminated-nullable-FK convention).
export class SubmitEvidenceItemDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'An existing Document owned by the caller.' })
  @ValidateIf((dto: SubmitEvidenceItemDto) => !dto.externalSourceRef)
  @IsUUID()
  documentId?: string;

  @ApiPropertyOptional({
    description:
      'A non-Document evidence source (e.g. an external record lookup reference). Mutually exclusive with documentId.',
  })
  @ValidateIf((dto: SubmitEvidenceItemDto) => !dto.documentId)
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  externalSourceRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  externalSourceDescription?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'The prior EvidenceItem this submission replaces. The prior item is preserved as SUPERSEDED, never deleted or mutated.',
  })
  @IsOptional()
  @IsUUID()
  supersedesItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @ApiPropertyOptional({
    description:
      'A hash of the artifact bytes as computed and asserted by the client. Never independently verified against stored bytes by this platform.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  integrityHash?: string;
}

export class VerifyEvidenceItemDto {
  @ApiProperty({ enum: EvidenceVerificationResult })
  @IsEnum(EvidenceVerificationResult)
  result!: EvidenceVerificationResult;

  @ApiPropertyOptional({
    description: 'Required when result is REJECTED or FLAGGED_FOR_REVIEW.',
    example: 'Document is expired; the address section is not legible.',
  })
  @ValidateIf(
    (dto: VerifyEvidenceItemDto) =>
      dto.result === EvidenceVerificationResult.REJECTED ||
      dto.result === EvidenceVerificationResult.FLAGGED_FOR_REVIEW,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason?: string;
}
