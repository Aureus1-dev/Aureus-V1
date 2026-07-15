import { ApiProperty } from '@nestjs/swagger';
import type { LearningPathCourse } from '@prisma/client';

export class PathCourseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() learningPathId: string;
  @ApiProperty() courseId: string;
  @ApiProperty() position: number;
  @ApiProperty() createdAt: Date;

  static fromEntity(pc: LearningPathCourse): PathCourseResponseDto {
    const dto = new PathCourseResponseDto();
    Object.assign(dto, pc);
    return dto;
  }
}
