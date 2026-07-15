import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { KnowledgeCategory } from '@prisma/client';

export class UpdateArticleDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 200 })
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(10)
  content?: string;

  @ApiPropertyOptional({ enum: KnowledgeCategory })
  @IsOptional() @IsEnum(KnowledgeCategory)
  category?: KnowledgeCategory;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional() @IsUrl()
  sourceUrl?: string;
}
