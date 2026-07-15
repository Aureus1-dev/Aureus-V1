import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementResponseDto } from './announcement-response.dto';

export class PaginatedAnnouncementsResponseDto {
  @ApiProperty({ type: [AnnouncementResponseDto] }) data: AnnouncementResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
