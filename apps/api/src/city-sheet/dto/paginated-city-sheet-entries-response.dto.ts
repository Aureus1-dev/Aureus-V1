import { ApiProperty } from '@nestjs/swagger';
import { CitySheetEntryResponseDto } from './city-sheet-entry-response.dto';

export class PaginatedCitySheetEntriesResponseDto {
  @ApiProperty({ type: [CitySheetEntryResponseDto] }) data: CitySheetEntryResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
