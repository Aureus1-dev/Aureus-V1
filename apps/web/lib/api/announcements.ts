import { apiRequest } from './http';
import type { UserRole } from './users';

/**
 * DTO shapes mirror `apps/api/src/communication/announcements/dto/*` exactly
 * (FPB-009 §8). The Founder Operating System's Announcements composer panel
 * (PR-003) is the first frontend consumer of the full create → publish →
 * archive lifecycle; the backend already supports every scope and audience.
 */
export type AnnouncementScope = 'PLATFORM' | 'ORGANIZATION' | 'ROLE' | 'STEWARD_MEMBERS';
export type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';

export interface AnnouncementDto {
  id: string;
  title: string;
  body: string;
  scope: AnnouncementScope;
  organizationId: string | null;
  targetRole: UserRole | null;
  stewardId: string | null;
  status: AnnouncementStatus;
  isCritical: boolean;
  scheduledFor: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  archivedAt: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAnnouncementsDto {
  data: AnnouncementDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  scope: AnnouncementScope;
  organizationId?: string;
  targetRole?: UserRole;
  stewardId?: string;
  isCritical?: boolean;
  scheduledFor?: string;
  expiresAt?: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  body?: string;
  scheduledFor?: string;
  expiresAt?: string;
  isCritical?: boolean;
}

export interface ListAnnouncementsParams {
  page?: number;
  limit?: number;
  scope?: AnnouncementScope;
  status?: AnnouncementStatus;
  organizationId?: string;
}

export function listAnnouncements(accessToken: string, params: ListAnnouncementsParams = {}): Promise<PaginatedAnnouncementsDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.scope) query.set('scope', params.scope);
  if (params.status) query.set('status', params.status);
  if (params.organizationId) query.set('organizationId', params.organizationId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedAnnouncementsDto>(`/communications/announcements${suffix}`, { accessToken });
}

export function getAnnouncement(accessToken: string, id: string): Promise<AnnouncementDto> {
  return apiRequest<AnnouncementDto>(`/communications/announcements/${id}`, { accessToken });
}

export function createAnnouncement(accessToken: string, input: CreateAnnouncementInput): Promise<AnnouncementDto> {
  return apiRequest<AnnouncementDto>('/communications/announcements', { method: 'POST', accessToken, body: input });
}

export function updateAnnouncement(accessToken: string, id: string, input: UpdateAnnouncementInput): Promise<AnnouncementDto> {
  return apiRequest<AnnouncementDto>(`/communications/announcements/${id}`, { method: 'PATCH', accessToken, body: input });
}

export function publishAnnouncement(accessToken: string, id: string): Promise<AnnouncementDto> {
  return apiRequest<AnnouncementDto>(`/communications/announcements/${id}/publish`, { method: 'POST', accessToken });
}

export function archiveAnnouncement(accessToken: string, id: string): Promise<AnnouncementDto> {
  return apiRequest<AnnouncementDto>(`/communications/announcements/${id}/archive`, { method: 'POST', accessToken });
}
