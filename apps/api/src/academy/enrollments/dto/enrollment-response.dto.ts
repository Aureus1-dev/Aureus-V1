import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import type { Enrollment } from '@prisma/client';

export class EnrollmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() courseId: string;
  @ApiProperty({ enum: EnrollmentStatus }) status: EnrollmentStatus;
  @ApiProperty() enrolledAt: Date;
  @ApiPropertyOptional({ nullable: true }) completedAt: Date | null;
  @ApiProperty() updatedAt: Date;

  static fromEntity(e: Enrollment): EnrollmentResponseDto {
    const dto = new EnrollmentResponseDto();
    Object.assign(dto, e);
    return dto;
  }
}
