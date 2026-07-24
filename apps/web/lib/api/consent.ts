import { apiRequest } from './http';

/** Mirrors `apps/api/src/consent/dto/consent-status-response.dto.ts` exactly. */
export interface ConsentStatusDto {
  granted: boolean;
  isCurrentVersion: boolean;
  version: string | null;
  grantedAt: string | null;
}

export function grantConsent(accessToken: string, userId: string, version: string): Promise<ConsentStatusDto> {
  return apiRequest<ConsentStatusDto>(`/users/${userId}/consent`, {
    method: 'POST',
    accessToken,
    body: { version },
  });
}

export function getConsentStatus(accessToken: string, userId: string): Promise<ConsentStatusDto> {
  return apiRequest<ConsentStatusDto>(`/users/${userId}/consent`, { accessToken });
}
