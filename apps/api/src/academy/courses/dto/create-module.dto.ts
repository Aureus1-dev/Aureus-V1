import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateModuleDto {
  @ApiProperty({ minLength: 2, maxLength: 200 }) @IsString() @MinLength(2) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) position: number;
}
