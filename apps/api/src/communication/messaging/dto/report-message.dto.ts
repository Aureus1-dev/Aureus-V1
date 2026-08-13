import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReportMessageDto {
  @ApiProperty({ description: 'Why this message is being reported' })
  @IsString() @MinLength(3) @MaxLength(1000)
  reason: string;
}
