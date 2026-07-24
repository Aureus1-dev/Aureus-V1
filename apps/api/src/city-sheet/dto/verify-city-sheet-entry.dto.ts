import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsDateString, IsEnum, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CitySheetVerificationConfidence } from '@prisma/client';
import { ChecklistResponseDto } from './checklist-response.dto';

export class VerifyCitySheetEntryDto {
  @ApiProperty({
    enum: CitySheetVerificationConfidence,
    description: 'How confident the steward is in this verification. Recorded for context — it never changes whether verify() succeeds.',
  })
  @IsEnum(CitySheetVerificationConfidence)
  confidence: CitySheetVerificationConfidence;

  @ApiPropertyOptional({ example: 'Called and confirmed hours, eligibility, and current operation on-site.' })
  @IsOptional() @IsString()
  verificationNotes?: string;

  @ApiPropertyOptional({ type: [ChecklistResponseDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistResponseDto)
  checklistResponses?: ChecklistResponseDto[];

  @ApiPropertyOptional({ example: '2026-10-22T00:00:00.000Z', description: 'When this entry should next be re-checked' })
  @IsOptional() @IsDateString()
  nextReviewDueAt?: string;
}
