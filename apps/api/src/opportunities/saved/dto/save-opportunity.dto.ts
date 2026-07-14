import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TrackingStatus } from '@prisma/client';

export class SaveOpportunityDto {
  @ApiProperty()
  @IsUUID()
  opportunityId: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateSavedOpportunityDto {
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({ enum: TrackingStatus })
  @IsOptional() @IsEnum(TrackingStatus)
  trackingStatus?: TrackingStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
