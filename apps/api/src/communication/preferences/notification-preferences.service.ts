import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { NotificationCategory } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/communication-roles.util';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { PreferenceResponseDto } from './dto/preference-response.dto';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from './repositories/notification-preference.repository.interface';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY) private readonly repo: INotificationPreferenceRepository,
  ) {}

  /** All categories, merging stored customizations with the secure default for untouched categories. */
  async findAllForUser(userId: string, caller: AuthenticatedUser): Promise<PreferenceResponseDto[]> {
    this.assertSelfOrAdmin(userId, caller);
    const rows = await this.repo.findAllForUser(userId);
    const byCategory = new Map(rows.map((r) => [r.category, r]));

    return Object.values(NotificationCategory).map((category) => {
      const existing = byCategory.get(category);
      return existing ? PreferenceResponseDto.fromEntity(existing) : PreferenceResponseDto.defaultFor(userId, category);
    });
  }

  async update(
    userId: string, category: NotificationCategory, dto: UpdatePreferenceDto, caller: AuthenticatedUser,
  ): Promise<PreferenceResponseDto> {
    this.assertSelfOrAdmin(userId, caller);

    // SYSTEM's in-app channel is the platform's one non-disableable
    // communication — "required transactional communications that cannot
    // be disabled" (PA-015 §Communication Preferences).
    if (category === NotificationCategory.SYSTEM && dto.inAppEnabled === false) {
      throw new BadRequestException('SYSTEM notifications cannot be disabled for the in-app channel');
    }

    const updated = await this.repo.upsert(userId, category, dto);
    return PreferenceResponseDto.fromEntity(updated);
  }

  private assertSelfOrAdmin(userId: string, caller: AuthenticatedUser): void {
    if (caller.id === userId) return;
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;
    throw new ForbiddenException('You may only manage your own notification preferences');
  }
}
