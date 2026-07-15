import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({ minLength: 2, maxLength: 200 }) @IsString() @MinLength(2) title: string;
  @ApiProperty({ minLength: 1 }) @IsString() @MinLength(1) content: string;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) position: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Optional Knowledge System integration — a related article for further reading' })
  @IsOptional() @IsUUID()
  relatedArticleId?: string;
}
