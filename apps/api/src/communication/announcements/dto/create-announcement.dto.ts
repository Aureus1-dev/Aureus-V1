import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AnnouncementScope, UserRole } from '@prisma/client';

export class CreateAnnouncementDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) title: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(5000) body: string;
  @ApiProperty({ enum: AnnouncementScope }) @IsEnum(AnnouncementScope) scope: AnnouncementScope;

  @ApiPropertyOptional({ description: 'Required when scope=ORGANIZATION' })
  @IsOptional() @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'Required when scope=ROLE' })
  @IsOptional() @IsEnum(UserRole)
  targetRole?: UserRole;

  @ApiPropertyOptional({ description: 'Required when scope=STEWARD_MEMBERS' })
  @IsOptional() @IsUUID()
  stewardId?: string;

  @ApiPropertyOptional({ default: false, description: 'Bypasses recipient ANNOUNCEMENT-category preferences for the in-app channel on publish' })
  @IsOptional() @IsBoolean()
  isCritical?: boolean;

  @ApiPropertyOptional({ description: 'Marker only in V1 — no scheduler auto-publishes at this time' })
  @IsOptional() @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  expiresAt?: string;
}
