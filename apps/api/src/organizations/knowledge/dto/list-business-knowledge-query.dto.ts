import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessKnowledgeStatus, BusinessKnowledgeType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class ListBusinessKnowledgeQueryDto {
  @ApiPropertyOptional({ enum: BusinessKnowledgeStatus })
  @IsOptional() @IsEnum(BusinessKnowledgeStatus)
  status?: BusinessKnowledgeStatus;

  @ApiPropertyOptional({ enum: BusinessKnowledgeType })
  @IsOptional() @IsEnum(BusinessKnowledgeType)
  knowledgeType?: BusinessKnowledgeType;

  @ApiPropertyOptional({ description: 'Only records whose next review date has arrived' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  reviewDue?: boolean;
}
