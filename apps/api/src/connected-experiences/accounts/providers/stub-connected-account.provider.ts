import { Injectable, Logger } from '@nestjs/common';
import { ConnectedProviderType } from '@prisma/client';
import { getConnectedProviderCatalogEntry } from '../../common/connected-providers.catalog';
import { ConnectionInitiationResult, IConnectedAccountProvider } from './connected-account-provider.interface';

/**
 * Safe default provider — active for every ConnectedProviderType until a
 * real adapter is configured for it (no real OAuth/API credentials exist
 * in this environment for any provider today). Mirrors StubAiProvider and
 * NodemailerEmailService's jsonTransport fallback: the real call path runs
 * end-to-end through the same interface every caller uses, but no
 * outbound connection is attempted and, critically, no ConnectedAccount
 * row is ever created for a connection this stub reports. This is the
 * concrete enforcement of "never simulate a successful third-party
 * connection."
 */
@Injectable()
export class StubConnectedAccountProvider implements IConnectedAccountProvider {
  private readonly logger = new Logger(StubConnectedAccountProvider.name);

  isConfigured(): boolean {
    return false;
  }

  async initiateConnection(providerType: ConnectedProviderType): Promise<ConnectionInitiationResult> {
    const entry = getConnectedProviderCatalogEntry(providerType);
    this.logger.warn(`No real adapter configured for ${providerType} — reporting Coming Soon, not connecting.`);

    return {
      status: 'COMING_SOON',
      message: `Coming Soon: the architecture for connecting ${entry.displayName} is complete, and live authorization will be enabled once production credentials are configured.`,
    };
  }

  async revokeConnection(): Promise<void> {
    this.logger.warn('revokeConnection called against the stub provider — no real connection exists to revoke.');
  }
}
