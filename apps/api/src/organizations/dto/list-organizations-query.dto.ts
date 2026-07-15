import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrganizationStatus, OrganizationType, VerificationStatus } from '@prisma/client';
import { SortField } from '../repositories/organization.repository.interface';

export class ListOrganizationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Full-text search across name and short description' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: OrganizationType })
  @IsOptional() @IsEnum(OrganizationType)
  organizationType?: OrganizationType;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsOptional() @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @ApiPropertyOptional({ enum: VerificationStatus, default: VerificationStatus.VERIFIED })
  @IsOptional() @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({ enum: ['newest', 'alphabetical'], default: 'newest' })
  @IsOptional() @IsEnum(['newest', 'alphabetical'])
  sortBy?: SortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional() @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
