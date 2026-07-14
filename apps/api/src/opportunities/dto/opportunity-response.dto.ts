import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BenefitType, OpportunityCategory, OpportunityStatus,
  SourceType, VerificationStatus,
} from '@prisma/client';
import type { Opportunity } from '@prisma/client';

export class OpportunityResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Stable human-readable ID, e.g. AUR-OPP-000001' })
  opportunityRef: string | null;
  @ApiProperty() title: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty() fullDescription: string;
  @ApiProperty({ enum: OpportunityCategory }) category: OpportunityCategory;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty() provider: string;
  @ApiProperty() officialSourceUrl: string;
  @ApiPropertyOptional({ nullable: true }) applicationUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) location: string | null;
  @ApiPropertyOptional({ nullable: true }) country: string | null;
  @ApiPropertyOptional({ nullable: true }) state: string | null;
  @ApiProperty() eligibilityRules: string;
  @ApiProperty({ enum: BenefitType }) benefitType: BenefitType;
  @ApiPropertyOptional({ nullable: true }) benefitAmount: string | null;
  @ApiPropertyOptional({ nullable: true }) deadline: Date | null;
  @ApiProperty({ enum: OpportunityStatus }) status: OpportunityStatus;
  @ApiProperty({ enum: VerificationStatus }) verificationStatus: VerificationStatus;
  @ApiPropertyOptional({ nullable: true }) rejectionReason: string | null;
  @ApiProperty({ description: '0–100' }) confidenceScore: number;
  @ApiProperty({ description: '0–100' }) freshnessScore: number;
  @ApiPropertyOptional({ nullable: true }) datePublished: Date | null;
  @ApiPropertyOptional({ nullable: true }) dateLastVerified: Date | null;
  @ApiProperty() sourceName: string;
  @ApiPropertyOptional({ nullable: true }) sourceUrl: string | null;
  @ApiProperty({ enum: SourceType }) sourceType: SourceType;
  @ApiProperty() submittedById: string;
  @ApiProperty() createdById: string;
  @ApiProperty() lastUpdatedById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt: Date | null;

  static fromEntity(o: Opportunity): OpportunityResponseDto {
    const dto = new OpportunityResponseDto();
    Object.assign(dto, o);
    return dto;
  }
}
