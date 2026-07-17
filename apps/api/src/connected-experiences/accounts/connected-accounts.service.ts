import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConnectedAccountStatus, ConnectedProviderType } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { StewardActivityLogService } from '../activity/steward-activity-log.service';
import { getConnectedProviderCatalogEntry, listConnectedProviderCatalog } from '../common/connected-providers.catalog';
import { ConnectedAccountResponseDto } from './dto/connected-account-response.dto';
import { ConnectionAttemptResponseDto } from './dto/connection-attempt-response.dto';
import { ProviderCatalogItemResponseDto, ProviderConnectionState } from './dto/provider-catalog-item-response.dto';
import {
  CONNECTED_ACCOUNT_REPOSITORY,
  IConnectedAccountRepository,
} from './repositories/connected-account.repository.interface';
import {
  CONNECTED_ACCOUNT_PROVIDER,
  IConnectedAccountProvider,
} from './providers/connected-account-provider.interface';

/**
 * Connect never fabricates success (DOMAIN-008 Founder Decision 1): a
 * ConnectedAccount row is only ever created or reconnected when
 * provider.initiateConnection() reports AVAILABLE. When it reports
 * COMING_SOON, connect() records the request in the audit trail and
 * returns that honest status — no row, no fake connection.
 */
@Injectable()
export class ConnectedAccountsService {
  private readonly logger = new Logger(ConnectedAccountsService.name);

  constructor(
    @Inject(CONNECTED_ACCOUNT_REPOSITORY) private readonly repo: IConnectedAccountRepository,
    @Inject(CONNECTED_ACCOUNT_PROVIDER) private readonly provider: IConnectedAccountProvider,
    private readonly activityLog: StewardActivityLogService,
  ) {}

  async listCatalog(caller: AuthenticatedUser): Promise<ProviderCatalogItemResponseDto[]> {
    const accounts = await this.repo.findAllByUser(caller.id);
    const accountsByProvider = new Map(accounts.map((account) => [account.providerType, account]));

    return listConnectedProviderCatalog().map((entry) => {
      const account = accountsByProvider.get(entry.providerType);
      const configured = this.provider.isConfigured(entry.providerType);

      let connectionState: ProviderConnectionState;
      if (account?.status === ConnectedAccountStatus.CONNECTED) connectionState = 'CONNECTED';
      else if (!configured) connectionState = 'COMING_SOON';
      else connectionState = 'NOT_CONNECTED';

      return {
        providerType: entry.providerType,
        displayName: entry.displayName,
        category: entry.category,
        whatAureusCanAccess: entry.whatAureusCanAccess,
        whyItsNeeded: entry.whyItsNeeded,
        whatTheAiStewardCanDo: entry.whatTheAiStewardCanDo,
        connectionState,
        account: account ? ConnectedAccountResponseDto.fromEntity(account) : undefined,
      };
    });
  }

  async connect(providerType: ConnectedProviderType, caller: AuthenticatedUser): Promise<ConnectionAttemptResponseDto> {
    const entry = getConnectedProviderCatalogEntry(providerType);
    const existing = await this.repo.findOne(caller.id, providerType);

    if (existing?.status === ConnectedAccountStatus.CONNECTED) {
      return {
        providerType,
        status: 'AVAILABLE',
        message: `${entry.displayName} is already connected.`,
        account: ConnectedAccountResponseDto.fromEntity(existing),
      };
    }

    await this.activityLog.record({
      userId: caller.id,
      eventType: 'CONNECTION_REQUESTED',
      actor: 'MEMBER',
      description: `Requested to connect ${entry.displayName}.`,
    });

    const result = await this.provider.initiateConnection(providerType, caller.id);

    if (result.status === 'COMING_SOON') {
      return { providerType, status: 'COMING_SOON', message: result.message };
    }

    const account = existing
      ? await this.repo.reconnect(existing.id, {
          grantedScopes: result.grantedScopes ?? [],
          externalAccountRef: result.externalAccountRef,
        })
      : await this.repo.create({
          userId: caller.id,
          providerType,
          grantedScopes: result.grantedScopes ?? [],
          externalAccountRef: result.externalAccountRef,
        });

    await this.activityLog.record({
      userId: caller.id,
      eventType: 'CONNECTION_ESTABLISHED',
      actor: 'MEMBER',
      connectedAccountId: account.id,
      description: `Connected ${entry.displayName}.`,
    });

    this.logger.log(`Connected account established: ${providerType} for user ${caller.id}`);
    return {
      providerType,
      status: 'AVAILABLE',
      message: result.message,
      account: ConnectedAccountResponseDto.fromEntity(account),
    };
  }

  async revoke(providerType: ConnectedProviderType, caller: AuthenticatedUser): Promise<void> {
    const entry = getConnectedProviderCatalogEntry(providerType);
    const existing = await this.repo.findOne(caller.id, providerType);
    if (!existing || existing.status !== ConnectedAccountStatus.CONNECTED) {
      throw new NotFoundException(`No active ${entry.displayName} connection to revoke`);
    }

    await this.provider.revokeConnection(providerType, existing.externalAccountRef);
    await this.repo.setStatus(existing.id, ConnectedAccountStatus.REVOKED, new Date());

    await this.activityLog.record({
      userId: caller.id,
      eventType: 'CONNECTION_REVOKED',
      actor: 'MEMBER',
      connectedAccountId: existing.id,
      description: `Revoked ${entry.displayName}.`,
    });

    this.logger.log(`Connected account revoked: ${providerType} for user ${caller.id}`);
  }
}
