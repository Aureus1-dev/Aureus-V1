import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class FlagCitySheetEntryForReviewDto {
  @ApiProperty({ example: 'Phone number no longer connects; needs re-verification before Gate B relies on it.' })
  @IsString() @MinLength(3)
  reason: string;
}
