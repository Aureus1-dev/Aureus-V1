import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateEventDto {
  @ApiPropertyOptional({ minLength: 3 })
  @IsOptional() @IsString() @MinLength(3)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  location?: string;
}
