import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class UpdateLessonDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) content?: string;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsInt() @Min(0) position?: number;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional() @IsInt() @Min(1)
  estimatedDurationMinutes?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsUUID()
  relatedArticleId?: string | null;
}
