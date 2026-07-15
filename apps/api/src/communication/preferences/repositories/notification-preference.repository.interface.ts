import { NotificationCategory, NotificationPreference } from '@prisma/client';

export const NOTIFICATION_PREFERENCE_REPOSITORY = 'NOTIFICATION_PREFERENCE_REPOSITORY';

export interface UpsertPreferenceInput {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  digestEnabled?: boolean;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
}

export interface INotificationPreferenceRepository {
  findAllForUser(userId: string): Promise<NotificationPreference[]>;
  findByUserAndCategory(userId: string, category: NotificationCategory): Promise<NotificationPreference | null>;
  upsert(userId: string, category: NotificationCategory, data: UpsertPreferenceInput): Promise<NotificationPreference>;
}
