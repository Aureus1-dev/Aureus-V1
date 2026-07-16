import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/communication/notifications/dto/*`
 * exactly (FPB-009 §8). This client is written to the full backend
 * contract (list/read/read-all) so a future Notifications Domain can
 * extend it rather than replace it — Home itself only ever consumes a
 * preview (DOMAIN-003 §6).
 */
export type NotificationCategory =
  | 'ACCOUNT' | 'STEWARDSHIP' | 'JOURNEY' | 'OPPORTUNITY' | 'RESOURCE' | 'ORGANIZATION'
  | 'ANNOUNCEMENT' | 'MESSAGE' | 'SYSTEM' | 'ACADEMY' | 'POD' | 'AI_GUIDANCE' | 'KNOWLEDGE';

export interface NotificationDto {
  id: string;
  recipientId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  data: unknown;
  actorId: string | null;
  readAt: string | null;
  archivedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PaginatedNotificationsDto {
  data: NotificationDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  category?: NotificationCategory;
  unreadOnly?: boolean;
  includeArchived?: boolean;
}

export function listNotifications(
  accessToken: string,
  params: ListNotificationsParams = {},
): Promise<PaginatedNotificationsDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.category) query.set('category', params.category);
  if (params.unreadOnly !== undefined) query.set('unreadOnly', String(params.unreadOnly));
  if (params.includeArchived !== undefined) query.set('includeArchived', String(params.includeArchived));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedNotificationsDto>(`/communications/notifications${suffix}`, { accessToken });
}

export function markNotificationRead(accessToken: string, id: string): Promise<NotificationDto> {
  return apiRequest<NotificationDto>(`/communications/notifications/${id}/read`, { method: 'POST', accessToken });
}

export function markAllNotificationsRead(accessToken: string): Promise<{ count: number }> {
  return apiRequest<{ count: number }>('/communications/notifications/read-all', { method: 'POST', accessToken });
}
