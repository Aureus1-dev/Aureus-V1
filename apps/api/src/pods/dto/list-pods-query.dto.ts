import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PodStatus, PodType } from '@prisma/client';

export class ListPodsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Full-text search across name and short description' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: PodType })
  @IsOptional() @IsEnum(PodType)
  type?: PodType;

  @ApiPropertyOptional({ enum: PodStatus, default: PodStatus.ACTIVE })
  @IsOptional() @IsEnum(PodStatus)
  status?: PodStatus;
}
