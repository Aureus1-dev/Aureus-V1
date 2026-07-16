import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { PodType } from '@prisma/client';

export class CreatePodDto {
  @ApiProperty({ example: 'Riverside Home Pod', minLength: 3, maxLength: 200 })
  @IsString() @MinLength(3)
  name: string;

  @ApiProperty({ maxLength: 500 })
  @IsString() @MinLength(3)
  shortDescription: string;

  @ApiProperty()
  @IsString() @MinLength(10)
  fullDescription: string;

  @ApiProperty({ enum: PodType })
  @IsString()
  type: PodType;

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional() @IsString()
  primaryLanguage?: string;

  @ApiPropertyOptional({ example: 'Austin', description: 'The community area this Pod primarily serves — coarse only, never precise geolocation' })
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Central Texas' })
  @IsOptional() @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'Texas' })
  @IsOptional() @IsString()
  stateProvince?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional({ default: 12, minimum: 2, maximum: 50 })
  @IsOptional() @IsInt() @Min(2) @Max(50)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Stewardship Origin (Founder Decision #11) — institutional memory only, never hierarchy or ownership' })
  @IsOptional() @IsUUID()
  parentPodId?: string;
}
