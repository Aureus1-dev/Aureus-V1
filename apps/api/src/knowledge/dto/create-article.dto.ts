import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { KnowledgeCategory } from '@prisma/client';

export class CreateArticleDto {
  @ApiProperty({ example: 'How to Request a Steward', minLength: 3, maxLength: 200 })
  @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @ApiProperty({ maxLength: 500 })
  @IsString() @MaxLength(500)
  summary: string;

  @ApiProperty()
  @IsString() @MinLength(10)
  content: string;

  @ApiProperty({ enum: KnowledgeCategory })
  @IsEnum(KnowledgeCategory)
  category: KnowledgeCategory;

  @ApiPropertyOptional({ type: [String], example: ['stewardship', 'getting-started'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'https://example.org/source-material' })
  @IsOptional() @IsUrl()
  sourceUrl?: string;
}
