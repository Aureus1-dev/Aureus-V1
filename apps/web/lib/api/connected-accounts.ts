import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/connected-experiences/accounts/dto/*`
 * exactly (FPB-009 §8). Connect never fabricates success (DOMAIN-008
 * Founder Decision 1): `connectProvider` may return status `COMING_SOON`
 * with no `account` at all — the frontend must render that honestly, never
 * assume a row was created.
 */
export type ConnectedProviderType =
  | 'GMAIL'
  | 'GOOGLE_CALENDAR'
  | 'OUTLOOK_MAIL'
  | 'OUTLOOK_CALENDAR'
  | 'BANKING'
  | 'PAYROLL'
  | 'INVESTMENT_ACCOUNTS'
  | 'GOVERNMENT_BENEFITS'
  | 'TAX_RECORDS';

export type ConnectedProviderCategory = 'EMAIL' | 'CALENDAR' | 'FINANCIAL' | 'GOVERNMENT';
export type ConnectedAccountStatus = 'CONNECTED' | 'REVOKED' | 'ERROR';
export type ProviderConnectionState = 'CONNECTED' | 'NOT_CONNECTED' | 'COMING_SOON';

export interface ConnectedAccountDto {
  id: string;
  userId: string;
  providerType: ConnectedProviderType;
  status: ConnectedAccountStatus;
  grantedScopes: string[];
  externalAccountRef: string | null;
  connectedAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderCatalogItemDto {
  providerType: ConnectedProviderType;
  displayName: string;
  category: ConnectedProviderCategory;
  whatAureusCanAccess: string;
  whyItsNeeded: string;
  whatTheAiStewardCanDo: string;
  connectionState: ProviderConnectionState;
  account?: ConnectedAccountDto;
}

export interface ConnectionAttemptDto {
  providerType: ConnectedProviderType;
  status: 'AVAILABLE' | 'COMING_SOON';
  message: string;
  account?: ConnectedAccountDto;
}

export function listConnectedProviders(accessToken: string): Promise<ProviderCatalogItemDto[]> {
  return apiRequest<ProviderCatalogItemDto[]>('/connected-accounts', { accessToken });
}

export function connectProvider(accessToken: string, providerType: ConnectedProviderType): Promise<ConnectionAttemptDto> {
  return apiRequest<ConnectionAttemptDto>(`/connected-accounts/${providerType}/connect`, {
    method: 'POST',
    accessToken,
  });
}

export function revokeProvider(accessToken: string, providerType: ConnectedProviderType): Promise<void> {
  return apiRequest<void>(`/connected-accounts/${providerType}/revoke`, {
    method: 'POST',
    accessToken,
  });
}
