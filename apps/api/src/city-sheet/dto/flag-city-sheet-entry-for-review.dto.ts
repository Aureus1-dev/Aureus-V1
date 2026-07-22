import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CitySheetVerificationConfidence } from '@prisma/client';

export class FlagCitySheetEntryForReviewDto {
  @ApiProperty({ example: 'Phone number no longer connects; needs re-verification before Gate B relies on it.' })
  @IsString() @MinLength(3)
  reason: string;

  @ApiPropertyOptional({
    enum: CitySheetVerificationConfidence,
    description: 'How confident the flagger is that a re-check is needed. Optional — this is a lighter-weight signal than verify()/reject().',
  })
  @IsOptional() @IsEnum(CitySheetVerificationConfidence)
  confidence?: CitySheetVerificationConfidence;
}
