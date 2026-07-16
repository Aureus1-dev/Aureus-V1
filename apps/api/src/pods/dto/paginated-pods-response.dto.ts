import { ApiProperty } from '@nestjs/swagger';
import { PodResponseDto } from './pod-response.dto';

export class PaginatedPodsResponseDto {
  @ApiProperty({ type: [PodResponseDto] }) data: PodResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
