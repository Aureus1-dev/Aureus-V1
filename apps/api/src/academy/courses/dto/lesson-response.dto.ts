import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Lesson } from '@prisma/client';

export class LessonResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() moduleId: string;
  @ApiProperty() title: string;
  @ApiProperty() content: string;
  @ApiProperty() position: number;
  @ApiPropertyOptional({ nullable: true }) estimatedDurationMinutes: number | null;
  @ApiPropertyOptional({ nullable: true }) relatedArticleId: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(l: Lesson): LessonResponseDto {
    const dto = new LessonResponseDto();
    Object.assign(dto, l);
    return dto;
  }
}
