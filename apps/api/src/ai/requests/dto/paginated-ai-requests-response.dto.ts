import { ApiProperty } from '@nestjs/swagger';
import { AiRequestResponseDto } from './ai-request-response.dto';

export class PaginatedAiRequestsResponseDto {
  @ApiProperty({ type: [AiRequestResponseDto] }) data: AiRequestResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
