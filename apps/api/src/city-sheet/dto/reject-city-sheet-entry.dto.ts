import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsEnum, IsOptional, IsString, MinLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CitySheetVerificationConfidence } from '@prisma/client';
import { ChecklistResponseDto } from './checklist-response.dto';

export class RejectCitySheetEntryDto {
  @ApiProperty({ example: 'Phone number is disconnected and no successor organization could be found.' })
  @IsString() @MinLength(3)
  reason: string;

  @ApiProperty({
    enum: CitySheetVerificationConfidence,
    description: 'How confident the steward is in this rejection. Recorded for context — it never changes whether reject() succeeds.',
  })
  @IsEnum(CitySheetVerificationConfidence)
  confidence: CitySheetVerificationConfidence;

  @ApiPropertyOptional({ type: [ChecklistResponseDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistResponseDto)
  checklistResponses?: ChecklistResponseDto[];
}
