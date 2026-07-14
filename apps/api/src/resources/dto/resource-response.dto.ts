import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ResourceCategory, ResourceStatus, ResourceType,
  SourceType, VerificationStatus,
} from '@prisma/client';
import type { Resource } from '@prisma/client';

export class ResourceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Stable human-readable ID, e.g. AUR-RES-000001' })
  resourceRef: string | null;
  @ApiProperty() title: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty() fullDescription: string;
  @ApiProperty({ enum: ResourceCategory }) category: ResourceCategory;
  @ApiProperty({ enum: ResourceType }) resourceType: ResourceType;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty() organizationName: string;
  @ApiProperty() officialSourceUrl: string;
  @ApiPropertyOptional({ nullable: true }) contactName: string | null;
  @ApiPropertyOptional({ nullable: true }) contactEmail: string | null;
  @ApiPropertyOptional({ nullable: true }) contactPhone: string | null;
  @ApiPropertyOptional({ nullable: true }) location: string | null;
  @ApiPropertyOptional({ nullable: true }) country: string | null;
  @ApiPropertyOptional({ nullable: true }) state: string | null;
  @ApiPropertyOptional({ nullable: true }) city: string | null;
  @ApiProperty() isRemote: boolean;
  @ApiPropertyOptional({ nullable: true }) eligibilityNotes: string | null;
  @ApiProperty({ enum: ResourceStatus }) status: ResourceStatus;
  @ApiProperty({ enum: VerificationStatus }) verificationStatus: VerificationStatus;
  @ApiPropertyOptional({ nullable: true }) rejectionReason: string | null;
  @ApiProperty({ description: '0–100' }) confidenceScore: number;
  @ApiProperty({ description: '0–100' }) freshnessScore: number;
  @ApiPropertyOptional({ nullable: true }) datePublished: Date | null;
  @ApiPropertyOptional({ nullable: true }) dateLastVerified: Date | null;
  @ApiProperty() sourceName: string;
  @ApiPropertyOptional({ nullable: true }) sourceUrl: string | null;
  @ApiProperty({ enum: SourceType }) sourceType: SourceType;
  @ApiProperty() ownerId: string;
  @ApiProperty() submittedById: string;
  @ApiProperty() createdById: string;
  @ApiProperty() lastUpdatedById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt: Date | null;

  static fromEntity(r: Resource): ResourceResponseDto {
    const dto = new ResourceResponseDto();
    Object.assign(dto, r);
    return dto;
  }
}
