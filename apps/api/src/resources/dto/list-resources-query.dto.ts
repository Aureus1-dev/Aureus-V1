import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  ResourceCategory, ResourceStatus, ResourceType, VerificationStatus,
} from '@prisma/client';
import { SortField } from '../repositories/resource.repository.interface';

export class ListResourcesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Full-text search across title, description, organization name' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ResourceCategory })
  @IsOptional() @IsEnum(ResourceCategory)
  category?: ResourceCategory;

  @ApiPropertyOptional({ enum: ResourceType })
  @IsOptional() @IsEnum(ResourceType)
  resourceType?: ResourceType;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ description: 'Comma-separated tag list', example: 'free,walk-in' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((t: string) => t.trim()) : value))
  @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: ResourceStatus })
  @IsOptional() @IsEnum(ResourceStatus)
  status?: ResourceStatus;

  @ApiPropertyOptional({ enum: VerificationStatus, default: VerificationStatus.VERIFIED })
  @IsOptional() @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({ description: 'Filter to resources owned by this user (Steward/Admin only need not apply)' })
  @IsOptional() @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ enum: ['newest', 'confidence', 'freshness', 'alphabetical'], default: 'newest' })
  @IsOptional() @IsEnum(['newest', 'confidence', 'freshness', 'alphabetical'])
  sortBy?: SortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional() @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
