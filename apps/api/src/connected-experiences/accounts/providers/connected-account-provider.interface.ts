import { ConnectedProviderType } from '@prisma/client';

export const CONNECTED_ACCOUNT_PROVIDER = 'CONNECTED_ACCOUNT_PROVIDER';

export interface ConnectionInitiationResult {
  status: 'AVAILABLE' | 'COMING_SOON';
  externalAccountRef?: string;
  grantedScopes?: string[];
  /** Member-facing explanation, safe to display as-is. */
  message: string;
}

/**
 * Third-party connection provider abstraction (DOMAIN-008 Founder Decision
 * 1), mirroring IAiProvider/IEmailService: business logic depends on this
 * interface only, never on a concrete adapter, so a real per-provider
 * adapter (Google OAuth, Plaid, etc.) can be introduced later purely by
 * registering it in the DI factory below — with zero change to
 * ConnectedAccountsService. `isConfigured` must return false for any
 * provider type that has no real credentials configured; callers must
 * never create a ConnectedAccount row when initiateConnection() reports
 * COMING_SOON — that is the hard rule behind "never simulate a successful
 * third-party connection."
 */
export interface IConnectedAccountProvider {
  isConfigured(providerType: ConnectedProviderType): boolean;
  initiateConnection(providerType: ConnectedProviderType, userId: string): Promise<ConnectionInitiationResult>;
  revokeConnection(providerType: ConnectedProviderType, externalAccountRef: string | null): Promise<void>;
}
