import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CitySheetEntryStatus } from '@prisma/client';
import { CreateCitySheetEntryDto } from './create-city-sheet-entry.dto';

export class UpdateCitySheetEntryDto extends PartialType(CreateCitySheetEntryDto) {
  @ApiPropertyOptional({
    enum: CitySheetEntryStatus,
    description: 'Whether this organization/service is currently operating. Set back to ACTIVE to reverse an archive.',
  })
  @IsOptional() @IsEnum(CitySheetEntryStatus)
  status?: CitySheetEntryStatus;
}
