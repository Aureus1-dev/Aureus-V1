import { ApiProperty } from '@nestjs/swagger';
import { RecommendationResponseDto } from './recommendation-response.dto';

export class PaginatedRecommendationsResponseDto {
  @ApiProperty({ type: [RecommendationResponseDto] }) data: RecommendationResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
