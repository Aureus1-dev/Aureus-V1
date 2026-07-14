import { ApiProperty } from '@nestjs/swagger';
import { GoalResponseDto } from './goal-response.dto';

export class PaginatedGoalsResponseDto {
  @ApiProperty({ type: [GoalResponseDto] }) data: GoalResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
