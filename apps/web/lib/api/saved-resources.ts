import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/resources/saved/dto/*` exactly
 * (FPB-009 §8). Always self-scoped — the backend rejects any userId
 * other than the caller's own.
 */
export interface SavedResourceDto {
  id: string;
  userId: string;
  resourceId: string;
  isFavorite: boolean;
  notes: string | null;
  savedAt: string;
  updatedAt: string;
}

export function saveResource(accessToken: string, userId: string, resourceId: string): Promise<SavedResourceDto> {
  return apiRequest<SavedResourceDto>(`/users/${userId}/saved-resources`, {
    method: 'POST', accessToken, body: { resourceId },
  });
}

export function listSavedResources(accessToken: string, userId: string): Promise<SavedResourceDto[]> {
  return apiRequest<SavedResourceDto[]>(`/users/${userId}/saved-resources`, { accessToken });
}

export function updateSavedResource(
  accessToken: string,
  userId: string,
  resourceId: string,
  update: { isFavorite?: boolean; notes?: string },
): Promise<SavedResourceDto> {
  return apiRequest<SavedResourceDto>(`/users/${userId}/saved-resources/${resourceId}`, {
    method: 'PATCH', accessToken, body: update,
  });
}

export function removeSavedResource(accessToken: string, userId: string, resourceId: string): Promise<void> {
  return apiRequest<void>(`/users/${userId}/saved-resources/${resourceId}`, { method: 'DELETE', accessToken });
}
