import { apiRequest } from './http';

/** DTO shapes mirror `apps/api/src/connected-experiences/activity/dto/*` exactly (FPB-009 §8). */
export type StewardActivityEventType =
  | 'CONNECTION_REQUESTED'
  | 'CONNECTION_ESTABLISHED'
  | 'CONNECTION_REVOKED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_SUMMARIZED'
  | 'DOCUMENT_DELETED';

export type StewardActivityActor = 'MEMBER' | 'AI_STEWARD' | 'SYSTEM';

export interface ActivityLogDto {
  id: string;
  userId: string;
  eventType: StewardActivityEventType;
  actor: StewardActivityActor;
  description: string;
  connectedAccountId: string | null;
  documentId: string | null;
  occurredAt: string;
}

export interface PaginatedActivityDto {
  data: ActivityLogDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListActivityParams {
  page?: number;
  limit?: number;
  eventType?: StewardActivityEventType;
}

export function listStewardActivity(accessToken: string, params: ListActivityParams = {}): Promise<PaginatedActivityDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.eventType) query.set('eventType', params.eventType);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedActivityDto>(`/steward-activity${suffix}`, { accessToken });
}
