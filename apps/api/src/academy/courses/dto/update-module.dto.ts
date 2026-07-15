import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateModuleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsInt() @Min(0) position?: number;
}
