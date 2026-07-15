import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { StewardshipEscalationSeverity } from '@prisma/client';

export class CreateEscalationDto {
  @ApiProperty({ example: 'Member reports difficulty accessing a recommended benefit' })
  @IsString() @MinLength(1)
  title: string;

  @ApiProperty({ example: 'Member states the application portal for the recommended grant returns an error. Needs review.' })
  @IsString() @MinLength(10)
  description: string;

  @ApiPropertyOptional({ enum: StewardshipEscalationSeverity, default: StewardshipEscalationSeverity.MEDIUM })
  @IsOptional() @IsEnum(StewardshipEscalationSeverity)
  severity?: StewardshipEscalationSeverity;
}
