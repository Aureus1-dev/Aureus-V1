import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BenefitType, OpportunityCategory, OpportunityStatus, VerificationStatus } from '@prisma/client';
import { SortField } from '../repositories/opportunity.repository.interface';

export class ListOpportunitiesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Full-text search across title, description, provider' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: OpportunityCategory })
  @IsOptional() @IsEnum(OpportunityCategory)
  category?: OpportunityCategory;

  @ApiPropertyOptional({ enum: BenefitType })
  @IsOptional() @IsEnum(BenefitType)
  benefitType?: BenefitType;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Comma-separated tag list', example: 'federal,undergraduate' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((t: string) => t.trim()) : value))
  @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: OpportunityStatus })
  @IsOptional() @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;

  @ApiPropertyOptional({ enum: VerificationStatus, default: VerificationStatus.VERIFIED })
  @IsOptional() @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({ enum: ['afterNow', 'within7days', 'within30days'] })
  @IsOptional() @IsEnum(['afterNow', 'within7days', 'within30days'])
  deadlineFilter?: 'afterNow' | 'within7days' | 'within30days';

  @ApiPropertyOptional({ enum: ['newest', 'deadline', 'confidence', 'freshness'], default: 'newest' })
  @IsOptional() @IsEnum(['newest', 'deadline', 'confidence', 'freshness'])
  sortBy?: SortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional() @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
