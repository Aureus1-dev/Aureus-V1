import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveResourceDto {
  @ApiProperty()
  @IsUUID()
  resourceId: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateSavedResourceDto {
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
