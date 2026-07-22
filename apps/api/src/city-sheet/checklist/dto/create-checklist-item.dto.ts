import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsEnum, IsInt, IsOptional, IsString, MinLength,
} from 'class-validator';
import { CitySheetCategory } from '@prisma/client';

export class CreateChecklistItemDto {
  @ApiPropertyOptional({
    enum: CitySheetCategory,
    description: 'Omit for a "common" item that applies to every category',
  })
  @IsOptional() @IsEnum(CitySheetCategory)
  category?: CitySheetCategory;

  @ApiProperty({ example: 'Confirm 24/7 availability, or the exact hours if not 24/7' })
  @IsString() @MinLength(3)
  label: string;

  @ApiPropertyOptional({ default: 0, description: 'Lower sorts first' })
  @IsOptional() @IsInt()
  sortOrder?: number;
}
