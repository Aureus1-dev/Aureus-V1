import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CitySheetCategory, CitySheetVerificationStatus } from '@prisma/client';
import type { CitySheetEntryResponseDto } from '../../city-sheet/dto/city-sheet-entry-response.dto';

/**
 * Gate C (C4: Resource discovery). A member-facing subset of a City Sheet
 * entry — this is the first member-reachable surface for City Sheet data,
 * so it deliberately excludes internal steward/audit fields (verifiedById,
 * verificationNotes, rejectionReason, sourceNotes, createdById) that a
 * member has no reason to see. `verificationStatus` is included because
 * C5 (verified resource presentation) depends on it to visibly distinguish
 * verified from unverified — this DTO carries the fact, C5 owns how it's
 * shown.
 */
export class MatchedResourceDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Stable human-readable ID, e.g. AUR-CS-000001' })
  citySheetRef: string | null;
  @ApiProperty() organizationName: string;
  @ApiProperty({ enum: CitySheetCategory }) category: CitySheetCategory;
  @ApiProperty() description: string;
  @ApiPropertyOptional({ nullable: true }) address: string | null;
  @ApiProperty() serviceArea: string;
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

  static fromEntity(e: CitySheetEntryResponseDto): MatchedResourceDto {
    const dto = new MatchedResourceDto();
    dto.id = e.id;
    dto.citySheetRef = e.citySheetRef;
    dto.organizationName = e.organizationName;
    dto.category = e.category;
    dto.description = e.description;
    dto.address = e.address;
    dto.serviceArea = e.serviceArea;
    dto.phone = e.phone;
    dto.website = e.website;
    dto.hours = e.hours;
    dto.eligibilityRequirements = e.eligibilityRequirements;
    dto.languagesSupported = e.languagesSupported;
    dto.accessibilityNotes = e.accessibilityNotes;
    dto.cost = e.cost;
    dto.requiredDocuments = e.requiredDocuments;
    dto.referralRequired = e.referralRequired;
    dto.isEmergencyService = e.isEmergencyService;
    dto.verificationStatus = e.verificationStatus;
    return dto;
  }
}
