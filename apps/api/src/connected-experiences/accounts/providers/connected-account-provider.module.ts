import { Module } from '@nestjs/common';
import { CONNECTED_ACCOUNT_PROVIDER, IConnectedAccountProvider } from './connected-account-provider.interface';
import { StubConnectedAccountProvider } from './stub-connected-account.provider';

/**
 * Selects the active IConnectedAccountProvider. Today this always resolves
 * to the stub, because no real per-provider adapter (Google OAuth, Plaid,
 * etc.) has production credentials configured in any environment this
 * codebase runs in yet — mirroring AiProviderModule/VoiceProviderModule's
 * "real key present -> real provider, else safe stub" shape. When a real
 * adapter is introduced, it is registered here and selected by the same
 * factory, with zero change to ConnectedAccountsService.
 */
@Module({
  providers: [
    StubConnectedAccountProvider,
    {
      provide: CONNECTED_ACCOUNT_PROVIDER,
      useFactory: (stub: StubConnectedAccountProvider): IConnectedAccountProvider => stub,
      inject: [StubConnectedAccountProvider],
    },
  ],
  exports: [CONNECTED_ACCOUNT_PROVIDER],
})
export class ConnectedAccountProviderModule {}
