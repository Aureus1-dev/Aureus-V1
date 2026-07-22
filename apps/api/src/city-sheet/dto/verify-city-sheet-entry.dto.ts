import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class VerifyCitySheetEntryDto {
  @ApiPropertyOptional({ example: 'Called and confirmed hours, eligibility, and current operation on-site.' })
  @IsOptional() @IsString()
  verificationNotes?: string;

  @ApiPropertyOptional({ example: '2026-10-22T00:00:00.000Z', description: 'When this entry should next be re-checked' })
  @IsOptional() @IsDateString()
  nextReviewDueAt?: string;
}
