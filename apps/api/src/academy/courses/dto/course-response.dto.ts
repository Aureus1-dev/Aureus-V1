import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AcademyContentStatus, LearningDomain, VerificationStatus } from '@prisma/client';
import type { Course } from '@prisma/client';

export class CourseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Stable human-readable ID, e.g. AUR-CRS-000001' })
  courseRef: string | null;
  @ApiProperty() title: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty() fullDescription: string;
  @ApiProperty({ enum: LearningDomain }) learningDomain: LearningDomain;
  @ApiPropertyOptional({ nullable: true }) estimatedDurationMinutes: number | null;
  @ApiProperty({ enum: AcademyContentStatus }) status: AcademyContentStatus;
  @ApiProperty({ enum: VerificationStatus }) verificationStatus: VerificationStatus;
  @ApiPropertyOptional({ nullable: true }) rejectionReason: string | null;
  @ApiProperty() version: number;
  @ApiProperty() grantsCertification: boolean;
  @ApiPropertyOptional({ nullable: true }) organizationId: string | null;
  @ApiProperty() authorId: string;
  @ApiProperty() lastUpdatedById: string;
  @ApiPropertyOptional({ nullable: true }) datePublished: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(c: Course): CourseResponseDto {
    const dto = new CourseResponseDto();
    Object.assign(dto, c);
    return dto;
  }
}
