import { ConnectedAccount, ConnectedAccountStatus, ConnectedProviderType } from '@prisma/client';

export const CONNECTED_ACCOUNT_REPOSITORY = 'CONNECTED_ACCOUNT_REPOSITORY';

export interface CreateConnectedAccountInput {
  userId: string;
  providerType: ConnectedProviderType;
  grantedScopes: string[];
  externalAccountRef?: string;
}

export interface ReconnectConnectedAccountInput {
  grantedScopes: string[];
  externalAccountRef?: string;
}

export interface IConnectedAccountRepository {
  findOne(userId: string, providerType: ConnectedProviderType): Promise<ConnectedAccount | null>;
  findAllByUser(userId: string): Promise<ConnectedAccount[]>;
  create(data: CreateConnectedAccountInput): Promise<ConnectedAccount>;
  reconnect(id: string, data: ReconnectConnectedAccountInput): Promise<ConnectedAccount>;
  setStatus(id: string, status: ConnectedAccountStatus, revokedAt?: Date): Promise<ConnectedAccount>;
}
