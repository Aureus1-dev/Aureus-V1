import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateMediaAssetDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 200 })
  @IsOptional() @IsString() @MinLength(2)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(1)
  storageRef?: string;

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
