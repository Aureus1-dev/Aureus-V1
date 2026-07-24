import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CitySheetCategory, CitySheetEntryStatus, CitySheetVerificationStatus, LaunchAreaScope,
} from '@prisma/client';

export class ListCitySheetEntriesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Full-text search across organization name, description, service area' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: CitySheetCategory })
  @IsOptional() @IsEnum(CitySheetCategory)
  category?: CitySheetCategory;

  @ApiPropertyOptional({ enum: LaunchAreaScope })
  @IsOptional() @IsEnum(LaunchAreaScope)
  launchScope?: LaunchAreaScope;

  @ApiPropertyOptional({ enum: CitySheetVerificationStatus })
  @IsOptional() @IsEnum(CitySheetVerificationStatus)
  verificationStatus?: CitySheetVerificationStatus;

  @ApiPropertyOptional({ enum: CitySheetEntryStatus })
  @IsOptional() @IsEnum(CitySheetEntryStatus)
  status?: CitySheetEntryStatus;
}
