import { ApiProperty } from '@nestjs/swagger';
import { CourseResponseDto } from './course-response.dto';

export class PaginatedCoursesResponseDto {
  @ApiProperty({ type: [CourseResponseDto] }) data: CourseResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
