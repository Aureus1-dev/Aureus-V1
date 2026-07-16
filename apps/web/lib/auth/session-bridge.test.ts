import { refreshAccessToken } from './session-bridge';
import { clearTokens, getTokenSnapshot, setTokens } from './token-store';
import * as authApi from '../api/auth';

jest.mock('../api/auth');

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('session-bridge', () => {
  afterEach(() => {
    clearTokens();
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('returns null without calling the API when there is no refresh token', async () => {
    const result = await refreshAccessToken();
    expect(result).toBeNull();
    expect(mockedAuthApi.refresh).not.toHaveBeenCalled();
  });

  it('refreshes, rotates the stored refresh token, and returns the new access token', async () => {
    setTokens({ accessToken: 'stale-access', refreshToken: 'refresh-1', expiresIn: 900 });
    mockedAuthApi.refresh.mockResolvedValue({
      accessToken: 'fresh-access',
      refreshToken: 'refresh-2',
      tokenType: 'Bearer',
      expiresIn: 900,
    });

    const result = await refreshAccessToken();

    expect(result).toBe('fresh-access');
    expect(mockedAuthApi.refresh).toHaveBeenCalledWith('refresh-1');
    expect(getTokenSnapshot().accessToken).toBe('fresh-access');
    expect(getTokenSnapshot().refreshToken).toBe('refresh-2');
  });

  it('clears tokens and returns null when the refresh call fails', async () => {
    setTokens({ accessToken: 'stale-access', refreshToken: 'refresh-1', expiresIn: 900 });
    mockedAuthApi.refresh.mockRejectedValue(new Error('Invalid or expired refresh token'));

    const result = await refreshAccessToken();

    expect(result).toBeNull();
    expect(getTokenSnapshot()).toEqual({ accessToken: null, refreshToken: null, expiresAt: null });
  });

  it('de-duplicates concurrent refresh calls into a single request', async () => {
    setTokens({ accessToken: 'stale-access', refreshToken: 'refresh-1', expiresIn: 900 });
    let resolveRefresh!: (value: authApi.TokenPairDto) => void;
    mockedAuthApi.refresh.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const first = refreshAccessToken();
    const second = refreshAccessToken();

    resolveRefresh({ accessToken: 'fresh-access', refreshToken: 'refresh-2', tokenType: 'Bearer', expiresIn: 900 });
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(mockedAuthApi.refresh).toHaveBeenCalledTimes(1);
    expect(firstResult).toBe('fresh-access');
    expect(secondResult).toBe('fresh-access');
  });

  it('allows a new refresh after a previous one completes', async () => {
    setTokens({ accessToken: 'stale-access', refreshToken: 'refresh-1', expiresIn: 900 });
    mockedAuthApi.refresh.mockResolvedValueOnce({
      accessToken: 'fresh-access-1',
      refreshToken: 'refresh-2',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    await refreshAccessToken();

    mockedAuthApi.refresh.mockResolvedValueOnce({
      accessToken: 'fresh-access-2',
      refreshToken: 'refresh-3',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    const result = await refreshAccessToken();

    expect(mockedAuthApi.refresh).toHaveBeenCalledTimes(2);
    expect(mockedAuthApi.refresh).toHaveBeenNthCalledWith(2, 'refresh-2');
    expect(result).toBe('fresh-access-2');
  });
});
