import { ApiProperty } from '@nestjs/swagger';
import { MilestoneResponseDto } from './milestone-response.dto';

export class PaginatedMilestonesResponseDto {
  @ApiProperty({ type: [MilestoneResponseDto] }) data: MilestoneResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
