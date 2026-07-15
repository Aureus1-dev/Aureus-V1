import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AcademyContentStatus, VerificationStatus } from '@prisma/client';
import { SortField } from '../repositories/learning-path.repository.interface';

export class ListLearningPathsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Full-text search across title, short/full description' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: AcademyContentStatus })
  @IsOptional() @IsEnum(AcademyContentStatus)
  status?: AcademyContentStatus;

  @ApiPropertyOptional({ enum: VerificationStatus, default: VerificationStatus.VERIFIED })
  @IsOptional() @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  authorId?: string;

  @ApiPropertyOptional({ enum: ['newest', 'alphabetical'], default: 'newest' })
  @IsOptional() @IsEnum(['newest', 'alphabetical'])
  sortBy?: SortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional() @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
