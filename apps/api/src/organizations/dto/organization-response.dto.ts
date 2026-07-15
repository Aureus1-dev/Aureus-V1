import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus, OrganizationType, VerificationStatus } from '@prisma/client';
import type { Organization } from '@prisma/client';

export class OrganizationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Stable human-readable ID, e.g. AUR-ORG-000001' })
  organizationRef: string | null;
  @ApiProperty() name: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty() fullDescription: string;
  @ApiProperty({ enum: OrganizationType }) organizationType: OrganizationType;
  @ApiProperty() websiteUrl: string;
  @ApiPropertyOptional({ nullable: true }) contactEmail: string | null;
  @ApiPropertyOptional({ nullable: true }) contactPhone: string | null;
  @ApiPropertyOptional({ nullable: true }) location: string | null;
  @ApiPropertyOptional({ nullable: true }) country: string | null;
  @ApiPropertyOptional({ nullable: true }) state: string | null;
  @ApiPropertyOptional({ nullable: true }) city: string | null;
  @ApiProperty({ enum: OrganizationStatus }) status: OrganizationStatus;
  @ApiProperty({ enum: VerificationStatus }) verificationStatus: VerificationStatus;
  @ApiPropertyOptional({ nullable: true }) rejectionReason: string | null;
  @ApiPropertyOptional({ nullable: true }) datePublished: Date | null;
  @ApiPropertyOptional({ nullable: true }) dateLastVerified: Date | null;
  @ApiProperty() createdById: string;
  @ApiProperty() lastUpdatedById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt: Date | null;

  static fromEntity(o: Organization): OrganizationResponseDto {
    const dto = new OrganizationResponseDto();
    Object.assign(dto, o);
    return dto;
  }
}
