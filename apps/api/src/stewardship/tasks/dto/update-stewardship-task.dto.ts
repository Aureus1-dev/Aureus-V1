import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { StewardshipTaskStatus } from '@prisma/client';

export class UpdateStewardshipTaskDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: StewardshipTaskStatus })
  @IsOptional() @IsEnum(StewardshipTaskStatus)
  status?: StewardshipTaskStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dueDate?: string;
}
