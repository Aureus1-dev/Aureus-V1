import { ApiProperty } from '@nestjs/swagger';
import { LearningPathResponseDto } from './learning-path-response.dto';

export class PaginatedLearningPathsResponseDto {
  @ApiProperty({ type: [LearningPathResponseDto] }) data: LearningPathResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
