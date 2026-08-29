import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  HarvestBenefitImpactStatus,
  HarvestFilingStatus,
  HarvestLegalStatus,
  HarvestOfferKind,
} from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

const MAX_CENTS = 100_000_000;

export class UpsertHarvestProfileDto {
  @ApiProperty({ enum: HarvestOfferKind })
  @IsEnum(HarvestOfferKind)
  kind!: HarvestOfferKind;

  @ApiProperty({ example: 'PA' })
  @IsString()
  @MinLength(2)
  jurisdictionState!: string;

  @ApiPropertyOptional({ default: 'US' })
  @IsOptional()
  @IsString()
  jurisdictionCountry?: string;

  @ApiPropertyOptional({ default: 21 })
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(99)
  minAge?: number;

  @ApiProperty({ enum: HarvestLegalStatus })
  @IsEnum(HarvestLegalStatus)
  legalStatus!: HarvestLegalStatus;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  licenseAuthority!: string;

  @ApiProperty()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  licenseSourceUrl!: string;

  @ApiProperty()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  termsSourceUrl!: string;

  @ApiProperty()
  @IsDateString()
  termsVerifiedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  newCustomerOnly?: boolean;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  advertisedValueCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  bankrollRequiredCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  projectedCashInCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  projectedCashOutCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  projectedTaxableWinningsCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  projectedDeductibleLossesCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  playthroughRequiredCents!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  defaultUnitWagerCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(120)
  estimatedActionsPerMinute?: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(100_000)
  estimatedMinutes!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  executionInstructions!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  riskNotes!: string[];
}

export class CreateHarvestPlanDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2026)
  @Max(2100)
  taxYear!: number;

  @ApiProperty({ example: 'PA' })
  @IsString()
  @MinLength(2)
  jurisdictionState!: string;

  @ApiPropertyOptional({ default: 'US' })
  @IsOptional()
  @IsString()
  jurisdictionCountry?: string;

  @ApiProperty({ enum: HarvestFilingStatus })
  @IsEnum(HarvestFilingStatus)
  filingStatus!: HarvestFilingStatus;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  otherTaxableIncomeCents!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  itemizedDeductionsBeforeGamblingCents?: number;

  @ApiProperty({ enum: HarvestBenefitImpactStatus })
  @IsEnum(HarvestBenefitImpactStatus)
  benefitImpactStatus!: HarvestBenefitImpactStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresTaxProfessionalReview?: boolean;

  @ApiProperty({ example: 34 })
  @IsInt()
  @Min(18)
  @Max(120)
  memberAgeYears!: number;

  @ApiProperty({ description: 'Member attests their age is accurate for eligibility screening.' })
  @IsBoolean()
  attestsAgeAccuracy!: boolean;

  @ApiProperty({ description: 'Member reviewed the currently fresh operators and marked any offer they are no longer eligible to use.' })
  @IsBoolean()
  reviewedOfferEligibility!: boolean;

  @ApiProperty({ description: 'Member attests they are legally permitted to use Pennsylvania gaming promotions and are not currently self-excluded from the relevant gaming product.' })
  @IsBoolean()
  attestsLegalParticipation!: boolean;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  excludedOfferProfileIds?: string[];

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  bankrollLimitCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  projectedLossLimitCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(525_600)
  timeLimitMinutes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CENTS)
  targetNetCents?: number;

  @ApiProperty({ description: 'Member explicitly accepts that when Aureus says stop, the plan stops.' })
  @IsBoolean()
  acceptsStopRule!: boolean;
}

export class ReportHarvestProgressDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  operatorReportedRemainingCents!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  progressEvidenceReference?: string;
}

export class ConfirmHarvestRequirementDto {
  @ApiProperty()
  @IsBoolean()
  operatorConfirmedComplete!: boolean;
}

export class HarvestAmountDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(MAX_CENTS)
  amountCents!: number;
}

export class SkipHarvestItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  reason!: string;
}

export class StopHarvestPlanDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  reason!: string;
}
