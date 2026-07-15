import { ApiProperty } from '@nestjs/swagger';
import type { CourseRevision } from '@prisma/client';

export class CourseRevisionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() courseId: string;
  @ApiProperty() versionNumber: number;
  @ApiProperty() title: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty() fullDescription: string;
  @ApiProperty() editedById: string;
  @ApiProperty() createdAt: Date;

  static fromEntity(r: CourseRevision): CourseRevisionResponseDto {
    const dto = new CourseRevisionResponseDto();
    Object.assign(dto, r);
    return dto;
  }
}
