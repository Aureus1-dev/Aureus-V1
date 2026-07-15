import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { MediaType } from '@prisma/client';

export class CreateMediaAssetDto {
  @ApiProperty({ enum: MediaType })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiProperty({ minLength: 2, maxLength: 200 })
  @IsString() @MinLength(2)
  title: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ description: 'Opaque storage pointer (key/URL) — no cloud provider implemented yet' })
  @IsString() @MinLength(1)
  storageRef: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  sizeBytes?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  durationSeconds?: number;
}
