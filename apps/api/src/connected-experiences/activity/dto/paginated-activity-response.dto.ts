import { ApiProperty } from '@nestjs/swagger';
import { ActivityLogResponseDto } from './activity-log-response.dto';

export class PaginatedActivityResponseDto {
  @ApiProperty({ type: [ActivityLogResponseDto] }) data: ActivityLogResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
