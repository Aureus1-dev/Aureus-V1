import { clearTokens, getTokenSnapshot, setTokens, subscribeToTokens } from './token-store';

const STORAGE_KEY = 'aureus.auth.refreshToken';

describe('token-store', () => {
  afterEach(() => {
    clearTokens();
    window.localStorage.clear();
  });

  it('starts with no tokens', () => {
    expect(getTokenSnapshot()).toEqual({ accessToken: null, refreshToken: null, expiresAt: null });
  });

  it('sets tokens, computes an expiry, and persists only the refresh token', () => {
    const before = Date.now();
    setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 });
    const snapshot = getTokenSnapshot();

    expect(snapshot.accessToken).toBe('access-1');
    expect(snapshot.refreshToken).toBe('refresh-1');
    expect(snapshot.expiresAt).toBeGreaterThanOrEqual(before + 900 * 1000);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('refresh-1');
  });

  it('clears tokens and removes the persisted refresh token', () => {
    setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 });
    clearTokens();

    expect(getTokenSnapshot()).toEqual({ accessToken: null, refreshToken: null, expiresAt: null });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('notifies subscribers on set and clear', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToTokens(listener);

    setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 });
    expect(listener).toHaveBeenCalledTimes(1);

    clearTokens();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setTokens({ accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 900 });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
