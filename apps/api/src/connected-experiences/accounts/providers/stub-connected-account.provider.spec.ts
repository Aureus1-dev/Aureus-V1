import { StubConnectedAccountProvider } from './stub-connected-account.provider';

describe('StubConnectedAccountProvider — never simulates a successful connection', () => {
  let provider: StubConnectedAccountProvider;

  beforeEach(() => {
    provider = new StubConnectedAccountProvider();
  });

  it('reports every provider type as not configured', () => {
    expect(provider.isConfigured()).toBe(false);
  });

  it('initiateConnection always reports COMING_SOON, never AVAILABLE', async () => {
    const result = await provider.initiateConnection('GMAIL', 'user-001');
    expect(result.status).toBe('COMING_SOON');
    expect(result.externalAccountRef).toBeUndefined();
    expect(result.grantedScopes).toBeUndefined();
    expect(result.message).toMatch(/coming soon/i);
  });

  it('initiateConnection never claims a scope or external ref regardless of provider type', async () => {
    for (const providerType of ['BANKING', 'GOOGLE_CALENDAR', 'TAX_RECORDS'] as const) {
      const result = await provider.initiateConnection(providerType, 'user-001');
      expect(result.status).toBe('COMING_SOON');
    }
  });

  it('revokeConnection resolves without throwing (no real connection to revoke)', async () => {
    await expect(provider.revokeConnection('GMAIL', null)).resolves.toBeUndefined();
  });
});
