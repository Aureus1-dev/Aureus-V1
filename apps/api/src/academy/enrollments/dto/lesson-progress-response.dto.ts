import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonProgressStatus } from '@prisma/client';
import type { LessonProgress } from '@prisma/client';

export class LessonProgressResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() enrollmentId: string;
  @ApiProperty() lessonId: string;
  @ApiProperty({ enum: LessonProgressStatus }) status: LessonProgressStatus;
  @ApiPropertyOptional({ nullable: true }) startedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) completedAt: Date | null;
  @ApiProperty() updatedAt: Date;

  static fromEntity(p: LessonProgress): LessonProgressResponseDto {
    const dto = new LessonProgressResponseDto();
    Object.assign(dto, p);
    return dto;
  }
}
