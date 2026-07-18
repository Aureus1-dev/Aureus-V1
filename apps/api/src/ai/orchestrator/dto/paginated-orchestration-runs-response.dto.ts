import { ApiProperty } from '@nestjs/swagger';
import { OrchestrationRunResponseDto } from './orchestration-run-response.dto';

export class PaginatedOrchestrationRunsResponseDto {
  @ApiProperty({ type: [OrchestrationRunResponseDto] }) data: OrchestrationRunResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
