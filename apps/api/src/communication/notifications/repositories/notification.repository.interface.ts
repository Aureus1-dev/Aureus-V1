import { Notification, NotificationCategory } from '@prisma/client';

export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';

export interface CreateNotificationInput {
  recipientId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  actorId?: string;
  dedupeKey?: string;
  expiresAt?: Date;
}

export interface ListNotificationsQuery {
  page: number;
  limit: number;
  recipientId: string;
  category?: NotificationCategory;
  unreadOnly?: boolean;
  includeArchived?: boolean;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface INotificationRepository {
  create(data: CreateNotificationInput): Promise<Notification>;
  findByDedupeKey(recipientId: string, dedupeKey: string): Promise<Notification | null>;
  findById(id: string): Promise<Notification | null>;
  findAll(query: ListNotificationsQuery): Promise<PaginatedNotifications>;
  markRead(id: string): Promise<Notification>;
  markAllRead(recipientId: string): Promise<number>;
  archive(id: string): Promise<Notification>;
}
