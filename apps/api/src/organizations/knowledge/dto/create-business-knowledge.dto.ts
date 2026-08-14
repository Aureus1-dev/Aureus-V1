import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessKnowledgeType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBusinessKnowledgeDto {
  @ApiProperty({ minLength: 3, maxLength: 200 })
  @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @ApiProperty({ maxLength: 500 })
  @IsString() @MinLength(1) @MaxLength(500)
  summary: string;

  @ApiProperty({ minLength: 10, maxLength: 100000 })
  @IsString() @MinLength(10) @MaxLength(100000)
  content: string;

  @ApiProperty({ enum: BusinessKnowledgeType })
  @IsEnum(BusinessKnowledgeType)
  knowledgeType: BusinessKnowledgeType;

  @ApiProperty({ description: 'Human-readable provenance, such as an owner, policy name, or dated price sheet' })
  @IsString() @MinLength(1) @MaxLength(500)
  sourceReference: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUrl({ require_protocol: true })
  sourceUrl?: string;

  @ApiProperty({ minimum: 1, maximum: 3650, default: 90 })
  @IsInt() @Min(1) @Max(3650)
  freshnessIntervalDays: number;
}
