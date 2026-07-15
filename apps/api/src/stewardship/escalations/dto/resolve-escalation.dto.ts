import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResolveEscalationDto {
  @ApiProperty({ example: 'Contacted the provider; the application portal issue was on their end and has been fixed.' })
  @IsString() @MinLength(1)
  resolutionNotes: string;
}
