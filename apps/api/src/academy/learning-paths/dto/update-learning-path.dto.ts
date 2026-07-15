import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateLearningPathDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 200 })
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(10)
  fullDescription?: string;
}
