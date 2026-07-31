import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from './SessionContext';
import * as authApi from '../../lib/api/auth';
import { clearTokens, getTokenSnapshot, setTokens } from '../../lib/auth/token-store';

jest.mock('../../lib/api/auth');

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

// A minimal, valid-shaped (unsigned) JWT: header.payload.signature.
function fakeAccessToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.signature`;
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useSession>) => void }) {
  const session = useSession();
  useEffect(() => {
    onReady(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useSession>;
  const view = render(
    <SessionProvider>
      <Harness onReady={(value) => (api = value)} />
    </SessionProvider>,
  );
  return { getApi: () => api, ...view };
}

describe('SessionContext', () => {
  afterEach(() => {
    cleanup();
    clearTokens();
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('starts unauthenticated with no persisted session and finishes restoring quickly', async () => {
    const { getApi } = renderHarness();
    await waitFor(() => expect(getApi().isRestoring).toBe(false));
    expect(getApi().session.isAuthenticated).toBe(false);
    expect(mockedAuthApi.refresh).not.toHaveBeenCalled();
  });

  it('logs in, storing the access token and decoding member identity from it', async () => {
    mockedAuthApi.login.mockResolvedValue({
      user: { id: 'member-1', email: 'member@example.com', emailVerified: true, roles: ['MEMBER'], status: 'ACTIVE', createdAt: 'x', updatedAt: 'x', deletedAt: null },
      tokens: {
        accessToken: fakeAccessToken({ sub: 'member-1', email: 'member@example.com', roles: ['MEMBER'] }),
        refreshToken: 'refresh-1',
        tokenType: 'Bearer',
        expiresIn: 900,
      },
    });

    const { getApi } = renderHarness();
    await waitFor(() => expect(getApi().isRestoring).toBe(false));

    await act(async () => {
      await getApi().login('member@example.com', 'Str0ng!Passw0rd');
    });

    expect(getApi().session.isAuthenticated).toBe(true);
    expect(getApi().session.memberId).toBe('member-1');
    expect(getApi().session.email).toBe('member@example.com');
    expect(getApi().session.roles).toEqual(['MEMBER']);
    expect(getTokenSnapshot().refreshToken).toBe('refresh-1');
  });

  it('silently restores a session from a persisted refresh token on mount', async () => {
    // Simulates a page load that inherits an existing session: some
    // refresh token is already in the store before `SessionProvider`
    // mounts, regardless of how it originally got there.
    setTokens({ accessToken: 'stale-access', refreshToken: 'stored-refresh', expiresIn: -1 });
    mockedAuthApi.refresh.mockResolvedValue({
      accessToken: fakeAccessToken({ sub: 'member-2', email: 'returning@example.com', roles: ['MEMBER'] }),
      refreshToken: 'rotated-refresh',
      tokenType: 'Bearer',
      expiresIn: 900,
    });

    const { getApi } = renderHarness();
    await waitFor(() => expect(getApi().isRestoring).toBe(false));

    expect(mockedAuthApi.refresh).toHaveBeenCalledWith('stored-refresh');
    expect(getApi().session.isAuthenticated).toBe(true);
    expect(getApi().session.memberId).toBe('member-2');
  });

  it('logs out, clearing local session state and best-effort revoking server-side', async () => {
    mockedAuthApi.login.mockResolvedValue({
      user: { id: 'member-1', email: 'member@example.com', emailVerified: true, roles: ['MEMBER'], status: 'ACTIVE', createdAt: 'x', updatedAt: 'x', deletedAt: null },
      tokens: {
        accessToken: fakeAccessToken({ sub: 'member-1', email: 'member@example.com', roles: ['MEMBER'] }),
        refreshToken: 'refresh-1',
        tokenType: 'Bearer',
        expiresIn: 900,
      },
    });
    mockedAuthApi.logout.mockResolvedValue(undefined);

    const { getApi } = renderHarness();
    await waitFor(() => expect(getApi().isRestoring).toBe(false));
    await act(async () => {
      await getApi().login('member@example.com', 'Str0ng!Passw0rd');
    });

    await act(async () => {
      await getApi().logout();
    });

    expect(getApi().session.isAuthenticated).toBe(false);
    expect(mockedAuthApi.logout).toHaveBeenCalledWith('refresh-1');
    expect(getTokenSnapshot().refreshToken).toBeNull();
  });

  it('marks the session expired when a persisted refresh token fails to restore', async () => {
    setTokens({ accessToken: 'stale-access', refreshToken: 'expired-refresh', expiresIn: -1 });
    mockedAuthApi.refresh.mockRejectedValue(new Error('Invalid or expired refresh token'));

    const { getApi } = renderHarness();
    await waitFor(() => expect(getApi().isRestoring).toBe(false));

    expect(getApi().session.isAuthenticated).toBe(false);
  });

  it('does not clobber a manually-set session (setSession escape hatch remains functional)', async () => {
    const { getApi } = renderHarness();
    await waitFor(() => expect(getApi().isRestoring).toBe(false));

    act(() => {
      getApi().setSession({ ...getApi().session, permissions: ['manage_pods'] });
    });

    expect(getApi().session.permissions).toEqual(['manage_pods']);
  });
});
