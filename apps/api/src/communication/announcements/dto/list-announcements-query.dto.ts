import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AnnouncementScope, AnnouncementStatus } from '@prisma/client';

export class ListAnnouncementsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: AnnouncementScope })
  @IsOptional() @IsEnum(AnnouncementScope)
  scope?: AnnouncementScope;

  @ApiPropertyOptional({ enum: AnnouncementStatus, description: 'Administrator-only filter; ignored for non-privileged callers, who only ever see PUBLISHED' })
  @IsOptional() @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  organizationId?: string;
}
