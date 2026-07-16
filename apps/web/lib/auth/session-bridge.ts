import { refresh as refreshRequest } from '../api/auth';
import { clearTokens, getTokenSnapshot, setTokens } from './token-store';

let inFlightRefresh: Promise<string | null> | null = null;

/**
 * Refreshes the access token using the stored refresh token, with
 * in-flight de-duplication. Refresh tokens rotate on every use
 * (ADR-005) — without de-duplication, two near-simultaneous 401s would
 * each attempt a refresh, and the second would fail against an
 * already-rotated token, incorrectly ending the member's session.
 *
 * Returns the new access token, or null if there was nothing to refresh
 * or the refresh itself failed (in which case tokens are cleared and the
 * member is effectively signed out).
 */
export function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  const { refreshToken } = getTokenSnapshot();
  if (!refreshToken) {
    return Promise.resolve(null);
  }

  inFlightRefresh = performRefresh(refreshToken).finally(() => {
    inFlightRefresh = null;
  });

  return inFlightRefresh;
}

async function performRefresh(refreshToken: string): Promise<string | null> {
  try {
    const tokens = await refreshRequest(refreshToken);
    setTokens(tokens);
    return tokens.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}
