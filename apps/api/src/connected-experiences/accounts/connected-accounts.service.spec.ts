import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConnectedAccountStatus, UserRole } from '@prisma/client';
import type { ConnectedAccount } from '@prisma/client';
import { ConnectedAccountsService } from './connected-accounts.service';
import { CONNECTED_ACCOUNT_REPOSITORY, IConnectedAccountRepository } from './repositories/connected-account.repository.interface';
import { CONNECTED_ACCOUNT_PROVIDER, IConnectedAccountProvider } from './providers/connected-account-provider.interface';
import { StewardActivityLogService } from '../activity/steward-activity-log.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const CALLER: AuthenticatedUser = { id: 'user-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeAccount = (o: Partial<ConnectedAccount> = {}): ConnectedAccount => ({
  id: 'acct-001', userId: CALLER.id, providerType: 'GMAIL', status: ConnectedAccountStatus.CONNECTED,
  grantedScopes: [], externalAccountRef: null,
  connectedAt: NOW, revokedAt: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IConnectedAccountRepository> = {
  findOne: jest.fn(), findAllByUser: jest.fn(), create: jest.fn(), reconnect: jest.fn(), setStatus: jest.fn(),
};

const mockProvider: jest.Mocked<IConnectedAccountProvider> = {
  isConfigured: jest.fn(), initiateConnection: jest.fn(), revokeConnection: jest.fn(),
};

const mockActivityLog = { record: jest.fn() };

describe('ConnectedAccountsService — never simulates a successful third-party connection', () => {
  let service: ConnectedAccountsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        ConnectedAccountsService,
        { provide: CONNECTED_ACCOUNT_REPOSITORY, useValue: mockRepo },
        { provide: CONNECTED_ACCOUNT_PROVIDER, useValue: mockProvider },
        { provide: StewardActivityLogService, useValue: mockActivityLog },
      ],
    }).compile();
    service = m.get(ConnectedAccountsService);
    jest.clearAllMocks();
  });

  describe('listCatalog', () => {
    it('marks a provider COMING_SOON when not configured and not connected', async () => {
      mockRepo.findAllByUser.mockResolvedValue([]);
      mockProvider.isConfigured.mockReturnValue(false);

      const result = await service.listCatalog(CALLER);

      expect(result).toHaveLength(9);
      expect(result.every((item) => item.connectionState === 'COMING_SOON')).toBe(true);
      expect(result.every((item) => item.account === undefined)).toBe(true);
    });

    it('marks a provider CONNECTED when an active account exists, regardless of isConfigured', async () => {
      mockRepo.findAllByUser.mockResolvedValue([makeAccount()]);
      mockProvider.isConfigured.mockReturnValue(false);

      const result = await service.listCatalog(CALLER);
      const gmail = result.find((item) => item.providerType === 'GMAIL');

      expect(gmail?.connectionState).toBe('CONNECTED');
      expect(gmail?.account?.id).toBe('acct-001');
    });

    it('marks a provider NOT_CONNECTED when configured but the member has not connected it', async () => {
      mockRepo.findAllByUser.mockResolvedValue([]);
      mockProvider.isConfigured.mockImplementation((providerType) => providerType === 'GMAIL');

      const result = await service.listCatalog(CALLER);
      const gmail = result.find((item) => item.providerType === 'GMAIL');
      const banking = result.find((item) => item.providerType === 'BANKING');

      expect(gmail?.connectionState).toBe('NOT_CONNECTED');
      expect(banking?.connectionState).toBe('COMING_SOON');
    });
  });

  describe('connect', () => {
    it('returns the existing account without calling the provider if already connected', async () => {
      mockRepo.findOne.mockResolvedValue(makeAccount());

      const result = await service.connect('GMAIL', CALLER);

      expect(result.status).toBe('AVAILABLE');
      expect(result.account?.id).toBe('acct-001');
      expect(mockProvider.initiateConnection).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('never creates a ConnectedAccount row when the provider reports COMING_SOON', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockProvider.initiateConnection.mockResolvedValue({ status: 'COMING_SOON', message: 'Coming Soon: architecture complete.' });

      const result = await service.connect('GMAIL', CALLER);

      expect(result.status).toBe('COMING_SOON');
      expect(result.account).toBeUndefined();
      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.reconnect).not.toHaveBeenCalled();
      expect(mockActivityLog.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'CONNECTION_REQUESTED', actor: 'MEMBER' }));
      expect(mockActivityLog.record).not.toHaveBeenCalledWith(expect.objectContaining({ eventType: 'CONNECTION_ESTABLISHED' }));
    });

    it('creates an account and logs CONNECTION_ESTABLISHED only when the provider reports AVAILABLE', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockProvider.initiateConnection.mockResolvedValue({
        status: 'AVAILABLE', message: 'Connected.', grantedScopes: ['read'], externalAccountRef: 'ext-1',
      });
      mockRepo.create.mockResolvedValue(makeAccount({ grantedScopes: ['read'], externalAccountRef: 'ext-1' }));

      const result = await service.connect('GMAIL', CALLER);

      expect(result.status).toBe('AVAILABLE');
      expect(result.account?.grantedScopes).toEqual(['read']);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: CALLER.id, providerType: 'GMAIL' }));
      expect(mockActivityLog.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'CONNECTION_ESTABLISHED' }));
    });
  });

  describe('revoke', () => {
    it('throws NotFoundException when there is no active connection to revoke', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.revoke('GMAIL', CALLER)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the connection is already revoked', async () => {
      mockRepo.findOne.mockResolvedValue(makeAccount({ status: ConnectedAccountStatus.REVOKED }));
      await expect(service.revoke('GMAIL', CALLER)).rejects.toThrow(NotFoundException);
    });

    it('revokes an active connection and logs CONNECTION_REVOKED', async () => {
      const account = makeAccount();
      mockRepo.findOne.mockResolvedValue(account);
      mockRepo.setStatus.mockResolvedValue(makeAccount({ status: ConnectedAccountStatus.REVOKED }));

      await service.revoke('GMAIL', CALLER);

      expect(mockProvider.revokeConnection).toHaveBeenCalledWith('GMAIL', account.externalAccountRef);
      expect(mockRepo.setStatus).toHaveBeenCalledWith(account.id, ConnectedAccountStatus.REVOKED, expect.any(Date));
      expect(mockActivityLog.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'CONNECTION_REVOKED', actor: 'MEMBER' }));
    });
  });
});
