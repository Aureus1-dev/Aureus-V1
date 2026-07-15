import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { KnowledgeArticleStatus, KnowledgeCategory, VerificationStatus } from '@prisma/client';
import { SortField } from '../repositories/knowledge-article.repository.interface';

export class ListArticlesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Full-text search across title, summary, content' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: KnowledgeCategory })
  @IsOptional() @IsEnum(KnowledgeCategory)
  category?: KnowledgeCategory;

  @ApiPropertyOptional({ description: 'Comma-separated tag list', example: 'stewardship,getting-started' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((t: string) => t.trim()) : value))
  @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: KnowledgeArticleStatus })
  @IsOptional() @IsEnum(KnowledgeArticleStatus)
  status?: KnowledgeArticleStatus;

  @ApiPropertyOptional({ enum: VerificationStatus, default: VerificationStatus.VERIFIED })
  @IsOptional() @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({ description: 'Filter to articles authored by this user' })
  @IsOptional() @IsUUID()
  authorId?: string;

  @ApiPropertyOptional({ enum: ['newest', 'alphabetical'], default: 'newest' })
  @IsOptional() @IsEnum(['newest', 'alphabetical'])
  sortBy?: SortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional() @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
