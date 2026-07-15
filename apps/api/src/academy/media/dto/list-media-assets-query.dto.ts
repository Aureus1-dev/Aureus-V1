import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaType } from '@prisma/client';

export class ListMediaAssetsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Full-text search across title/description' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: MediaType })
  @IsOptional() @IsEnum(MediaType)
  type?: MediaType;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  uploadedById?: string;
}
