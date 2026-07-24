import { ApiProperty } from '@nestjs/swagger';

export class VerificationChecklistItemSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() label: string;
}

/**
 * Everything a Human Steward needs to complete one A4 verification call in
 * one request: the entry's current on-file facts, the applicable checklist
 * (common items + this entry's category, config-driven per A4-PREP), and a
 * ready-to-read call script generated from those two things. Nothing here
 * invents new facts about the organization — it only restates what is
 * already stored and prompts the steward to confirm or correct it.
 */
export class VerificationGuideResponseDto {
  @ApiProperty() citySheetEntryId: string;
  @ApiProperty() citySheetRef: string | null;
  @ApiProperty() organizationName: string;
  @ApiProperty() category: string;
  @ApiProperty() currentVerificationStatus: string;
  @ApiProperty({ type: [VerificationChecklistItemSummaryDto] }) checklist: VerificationChecklistItemSummaryDto[];
  @ApiProperty() callScript: string;
}
