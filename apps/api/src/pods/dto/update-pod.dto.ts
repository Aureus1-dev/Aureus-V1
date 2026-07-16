import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdatePodDto {
  @ApiPropertyOptional({ minLength: 3 })
  @IsOptional() @IsString() @MinLength(3)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(3)
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(10)
  fullDescription?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  primaryLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  stateProvince?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional({ minimum: 2, maximum: 50 })
  @IsOptional() @IsInt() @Min(2) @Max(50)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Days without a held PodEvent before the Pod is flagged DORMANT', minimum: 7 })
  @IsOptional() @IsInt() @Min(7)
  dormancyThresholdDays?: number;
}
