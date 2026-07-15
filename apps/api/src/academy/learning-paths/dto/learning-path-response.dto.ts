import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AcademyContentStatus, VerificationStatus } from '@prisma/client';
import type { LearningPath } from '@prisma/client';

export class LearningPathResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Stable human-readable ID, e.g. AUR-LP-000001' })
  pathRef: string | null;
  @ApiProperty() title: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty() fullDescription: string;
  @ApiProperty({ enum: AcademyContentStatus }) status: AcademyContentStatus;
  @ApiProperty({ enum: VerificationStatus }) verificationStatus: VerificationStatus;
  @ApiPropertyOptional({ nullable: true }) rejectionReason: string | null;
  @ApiProperty() authorId: string;
  @ApiProperty() lastUpdatedById: string;
  @ApiPropertyOptional({ nullable: true }) datePublished: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(p: LearningPath): LearningPathResponseDto {
    const dto = new LearningPathResponseDto();
    Object.assign(dto, p);
    return dto;
  }
}
