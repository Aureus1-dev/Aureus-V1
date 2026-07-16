import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/opportunities/saved/dto/*` exactly
 * (FPB-009 §8). Always self-scoped — the backend rejects any userId
 * other than the caller's own.
 */
export type TrackingStatus = 'SAVED' | 'APPLYING' | 'APPLIED' | 'RECEIVED' | 'NOT_INTERESTED';

export interface SavedOpportunityDto {
  id: string;
  userId: string;
  opportunityId: string;
  isFavorite: boolean;
  trackingStatus: TrackingStatus;
  notes: string | null;
  savedAt: string;
  updatedAt: string;
}

export function saveOpportunity(
  accessToken: string,
  userId: string,
  opportunityId: string,
): Promise<SavedOpportunityDto> {
  return apiRequest<SavedOpportunityDto>(`/users/${userId}/saved-opportunities`, {
    method: 'POST',
    accessToken,
    body: { opportunityId },
  });
}

export function listSavedOpportunities(accessToken: string, userId: string): Promise<SavedOpportunityDto[]> {
  return apiRequest<SavedOpportunityDto[]>(`/users/${userId}/saved-opportunities`, { accessToken });
}

export function updateSavedOpportunity(
  accessToken: string,
  userId: string,
  opportunityId: string,
  update: { isFavorite?: boolean; trackingStatus?: TrackingStatus; notes?: string },
): Promise<SavedOpportunityDto> {
  return apiRequest<SavedOpportunityDto>(`/users/${userId}/saved-opportunities/${opportunityId}`, {
    method: 'PATCH',
    accessToken,
    body: update,
  });
}

export function removeSavedOpportunity(accessToken: string, userId: string, opportunityId: string): Promise<void> {
  return apiRequest<void>(`/users/${userId}/saved-opportunities/${opportunityId}`, {
    method: 'DELETE',
    accessToken,
  });
}
