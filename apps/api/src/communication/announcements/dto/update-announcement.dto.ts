import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAnnouncementDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(5000) body?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledFor?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCritical?: boolean;
}
