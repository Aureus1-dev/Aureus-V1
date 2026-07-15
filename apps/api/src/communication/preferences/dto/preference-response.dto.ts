import { ApiProperty } from '@nestjs/swagger';
import { NotificationCategory } from '@prisma/client';
import type { NotificationPreference } from '@prisma/client';

export class PreferenceResponseDto {
  @ApiProperty() userId: string;
  @ApiProperty({ enum: NotificationCategory }) category: NotificationCategory;
  @ApiProperty() inAppEnabled: boolean;
  @ApiProperty() emailEnabled: boolean;
  @ApiProperty({ description: 'Reserved for a future scheduled-digest capability; not enforced in V1.' }) digestEnabled: boolean;
  @ApiProperty({ required: false, nullable: true }) quietHoursStart: number | null;
  @ApiProperty({ required: false, nullable: true }) quietHoursEnd: number | null;

  static fromEntity(p: NotificationPreference): PreferenceResponseDto {
    const dto = new PreferenceResponseDto();
    dto.userId = p.userId;
    dto.category = p.category;
    dto.inAppEnabled = p.inAppEnabled;
    dto.emailEnabled = p.emailEnabled;
    dto.digestEnabled = p.digestEnabled;
    dto.quietHoursStart = p.quietHoursStart;
    dto.quietHoursEnd = p.quietHoursEnd;
    return dto;
  }

  /** A category with no customized row yet — the secure default (both channels on). */
  static defaultFor(userId: string, category: NotificationCategory): PreferenceResponseDto {
    const dto = new PreferenceResponseDto();
    dto.userId = userId;
    dto.category = category;
    dto.inAppEnabled = true;
    dto.emailEnabled = true;
    dto.digestEnabled = false;
    dto.quietHoursStart = null;
    dto.quietHoursEnd = null;
    return dto;
  }
}
