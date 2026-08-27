import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SourceType } from '@prisma/client';

export type OpportunityLinkStatus = 'verified' | 'stale' | 'disabled';

/**
 * Server-owned actionable projection of an existing Opportunity. The URL in
 * this DTO is never accepted from model output: OpportunityLinkRegistryService
 * derives it only from the governed Opportunity record after verification.
 */
export class OpportunityActionResponseDto {
  @ApiProperty() opportunityId: string;
  @ApiPropertyOptional({ nullable: true }) opportunityRef: string | null;
  @ApiProperty() title: string;
  @ApiProperty() provider: string;
  @ApiProperty({ description: 'The verified URL the member may open.' }) url: string;
  @ApiProperty({ description: 'Governed canonical application/source URL.' }) canonicalUrl: string;
  @ApiPropertyOptional({ nullable: true }) referralUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) affiliateDisclosure: string | null;
  @ApiProperty() eligibility: string;
  @ApiPropertyOptional({ nullable: true }) geography: string | null;
  @ApiPropertyOptional({ nullable: true }) payoutNotes: string | null;
  @ApiPropertyOptional({ nullable: true }) timeToCashNotes: string | null;
  @ApiProperty({ enum: ['verified', 'stale', 'disabled'] }) status: OpportunityLinkStatus;
  @ApiPropertyOptional({ nullable: true }) lastVerifiedAt: Date | null;
  @ApiProperty() sourceName: string;
  @ApiPropertyOptional({ nullable: true }) sourceUrl: string | null;
  @ApiProperty({ enum: SourceType }) sourceType: SourceType;
}
