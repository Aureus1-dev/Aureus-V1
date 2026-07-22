import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CitySheetCategory, CitySheetEntryStatus, CitySheetVerificationConfidence,
  CitySheetVerificationStatus, LaunchAreaScope,
} from '@prisma/client';
import type { CitySheetEntry } from '@prisma/client';

export class CitySheetEntryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Stable human-readable ID, e.g. AUR-CS-000001' })
  citySheetRef: string | null;
  @ApiProperty() organizationName: string;
  @ApiProperty({ enum: CitySheetCategory }) category: CitySheetCategory;
  @ApiProperty() description: string;
  @ApiPropertyOptional({ nullable: true }) address: string | null;
  @ApiProperty() serviceArea: string;
  @ApiProperty({ enum: LaunchAreaScope }) launchScope: LaunchAreaScope;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiPropertyOptional({ nullable: true }) website: string | null;
  @ApiProperty() hours: string;
  @ApiPropertyOptional({ nullable: true }) eligibilityRequirements: string | null;
  @ApiProperty({ type: [String] }) languagesSupported: string[];
  @ApiPropertyOptional({ nullable: true }) accessibilityNotes: string | null;
  @ApiPropertyOptional({ nullable: true }) cost: string | null;
  @ApiProperty({ type: [String] }) requiredDocuments: string[];
  @ApiProperty() referralRequired: boolean;
  @ApiProperty() isEmergencyService: boolean;
  @ApiProperty({ enum: CitySheetVerificationStatus }) verificationStatus: CitySheetVerificationStatus;
  @ApiPropertyOptional({ enum: CitySheetVerificationConfidence, nullable: true }) verificationConfidence: CitySheetVerificationConfidence | null;
  @ApiPropertyOptional({ nullable: true }) lastVerifiedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) verifiedById: string | null;
  @ApiPropertyOptional({ nullable: true }) verificationNotes: string | null;
  @ApiPropertyOptional({ nullable: true }) rejectionReason: string | null;
  @ApiPropertyOptional({ nullable: true }) nextReviewDueAt: Date | null;
  @ApiPropertyOptional({ nullable: true, description: 'Immutable provenance of this candidate — never touched by verify/reject/flag-for-review' })
  sourceNotes: string | null;
  @ApiProperty({ enum: CitySheetEntryStatus }) status: CitySheetEntryStatus;
  @ApiProperty() createdById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(e: CitySheetEntry): CitySheetEntryResponseDto {
    const dto = new CitySheetEntryResponseDto();
    Object.assign(dto, e);
    return dto;
  }
}
