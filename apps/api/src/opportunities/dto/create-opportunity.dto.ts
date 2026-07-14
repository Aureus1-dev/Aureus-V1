import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID,
  IsUrl, MaxLength, MinLength,
} from 'class-validator';
import { BenefitType, OpportunityCategory, SourceType } from '@prisma/client';

export class CreateOpportunityDto {
  @ApiProperty({ example: 'Federal Pell Grant', minLength: 3, maxLength: 200 })
  @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @ApiProperty({ maxLength: 500 })
  @IsString() @MaxLength(500)
  shortDescription: string;

  @ApiProperty()
  @IsString() @MinLength(10)
  fullDescription: string;

  @ApiProperty({ enum: OpportunityCategory })
  @IsEnum(OpportunityCategory)
  category: OpportunityCategory;

  @ApiPropertyOptional({ type: [String], example: ['federal', 'undergraduate'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ example: 'U.S. Department of Education' })
  @IsString() @MinLength(2)
  provider: string;

  @ApiProperty({ example: 'https://studentaid.gov/understand-aid/types/grants/pell' })
  @IsUrl()
  officialSourceUrl: string;

  @ApiPropertyOptional({ example: 'https://studentaid.gov/apply' })
  @IsOptional() @IsUrl()
  applicationUrl?: string;

  @ApiPropertyOptional({ example: 'Nationwide or Online' })
  @IsOptional() @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Texas' })
  @IsOptional() @IsString()
  state?: string;

  @ApiProperty({ example: 'Must demonstrate financial need; enrolled in accredited institution' })
  @IsString() @MinLength(10)
  eligibilityRules: string;

  @ApiProperty({ enum: BenefitType })
  @IsEnum(BenefitType)
  benefitType: BenefitType;

  @ApiPropertyOptional({ example: 'Up to $7,395 per year' })
  @IsOptional() @IsString()
  benefitAmount?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional() @IsDateString()
  deadline?: string;

  @ApiProperty({ example: 'Federal Student Aid' })
  @IsString()
  sourceName: string;

  @ApiPropertyOptional({ example: 'https://studentaid.gov' })
  @IsOptional() @IsUrl()
  sourceUrl?: string;

  @ApiPropertyOptional({ enum: SourceType, default: SourceType.ADMIN_ENTRY })
  @IsOptional() @IsEnum(SourceType)
  sourceType?: SourceType;

  @ApiProperty({ description: 'UUID of the user submitting this opportunity' })
  @IsUUID()
  submittedById: string;

  @ApiProperty({ description: 'UUID of the user creating this record' })
  @IsUUID()
  createdById: string;
}
