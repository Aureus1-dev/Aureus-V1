import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CitySheetVerificationConfidence, CitySheetVerificationEventType, CitySheetVerificationStatus,
} from '@prisma/client';
import type { CitySheetVerificationEvent } from '@prisma/client';
import { ChecklistResponseDto } from './checklist-response.dto';

/** One row of the permanent, append-only verification history (A4-PREP). */
export class VerificationEventResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() citySheetEntryId: string;
  @ApiProperty({ enum: CitySheetVerificationEventType }) eventType: CitySheetVerificationEventType;
  @ApiProperty({ enum: CitySheetVerificationStatus }) previousStatus: CitySheetVerificationStatus;
  @ApiProperty({ enum: CitySheetVerificationStatus }) newStatus: CitySheetVerificationStatus;
  @ApiPropertyOptional({ enum: CitySheetVerificationConfidence, nullable: true }) confidence: CitySheetVerificationConfidence | null;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiPropertyOptional({ type: [ChecklistResponseDto], nullable: true }) checklistResponses: ChecklistResponseDto[] | null;
  @ApiProperty() performedById: string;
  @ApiProperty() performedAt: Date;

  static fromEntity(e: CitySheetVerificationEvent): VerificationEventResponseDto {
    const dto = new VerificationEventResponseDto();
    Object.assign(dto, e);
    dto.checklistResponses = (e.checklistResponses as unknown as ChecklistResponseDto[] | null) ?? null;
    return dto;
  }
}
