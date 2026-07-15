import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementScope, AnnouncementStatus, UserRole } from '@prisma/client';
import type { Announcement } from '@prisma/client';

export class AnnouncementResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiProperty({ enum: AnnouncementScope }) scope: AnnouncementScope;
  @ApiProperty({ required: false, nullable: true }) organizationId: string | null;
  @ApiProperty({ required: false, nullable: true, enum: UserRole }) targetRole: UserRole | null;
  @ApiProperty({ required: false, nullable: true }) stewardId: string | null;
  @ApiProperty({ enum: AnnouncementStatus }) status: AnnouncementStatus;
  @ApiProperty() isCritical: boolean;
  @ApiProperty({ required: false, nullable: true }) scheduledFor: Date | null;
  @ApiProperty({ required: false, nullable: true }) publishedAt: Date | null;
  @ApiProperty({ required: false, nullable: true }) expiresAt: Date | null;
  @ApiProperty({ required: false, nullable: true }) archivedAt: Date | null;
  @ApiProperty() authorId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(a: Announcement): AnnouncementResponseDto {
    const dto = new AnnouncementResponseDto();
    Object.assign(dto, a);
    return dto;
  }
}
