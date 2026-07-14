import { ApiProperty } from '@nestjs/swagger';
import { ResourceResponseDto } from './resource-response.dto';

export class PaginatedResourcesResponseDto {
  @ApiProperty({ type: [ResourceResponseDto] }) data: ResourceResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
