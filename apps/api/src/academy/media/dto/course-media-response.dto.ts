import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CourseMedia } from '@prisma/client';

export class CourseMediaResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() courseId: string;
  @ApiPropertyOptional({ nullable: true }) lessonId: string | null;
  @ApiProperty() mediaAssetId: string;
  @ApiProperty() position: number;
  @ApiProperty() createdAt: Date;

  static fromEntity(cm: CourseMedia): CourseMediaResponseDto {
    const dto = new CourseMediaResponseDto();
    Object.assign(dto, cm);
    return dto;
  }
}
