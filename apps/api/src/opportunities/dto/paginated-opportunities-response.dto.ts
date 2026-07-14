import { ApiProperty } from '@nestjs/swagger';
import { OpportunityResponseDto } from './opportunity-response.dto';

export class PaginatedOpportunitiesResponseDto {
  @ApiProperty({ type: [OpportunityResponseDto] }) data: OpportunityResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
