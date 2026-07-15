import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStewardshipTaskDto {
  @ApiProperty({ example: 'Complete resume draft before next check-in' })
  @IsString() @MinLength(1)
  title: string;

  @ApiPropertyOptional({ example: 'Focus on quantifying achievements in the experience section.' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional() @IsDateString()
  dueDate?: string;
}
