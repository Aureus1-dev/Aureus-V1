import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationCategory } from '@prisma/client';

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: NotificationCategory })
  @IsOptional() @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  includeArchived?: boolean;
}
