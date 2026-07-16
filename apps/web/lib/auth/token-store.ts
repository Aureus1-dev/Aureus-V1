const REFRESH_TOKEN_STORAGE_KEY = 'aureus.auth.refreshToken';

export interface TokenSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
  /** Epoch milliseconds the access token expires at, or null if unknown. */
  expiresAt: number | null;
}

/**
 * The real source of truth for auth tokens (FPB-010 §3 "Session State" —
 * "Authentication"). The access token is kept in memory only and never
 * written to `localStorage`; the refresh token is persisted so a page
 * reload can silently restore the session. This is a module-level store
 * rather than React state because `lib/api/http.ts` (not a component)
 * needs the current token synchronously on every request.
 */
let snapshot: TokenSnapshot = {
  accessToken: null,
  refreshToken: readPersistedRefreshToken(),
  expiresAt: null,
};

const listeners = new Set<() => void>();

function readPersistedRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

function persistRefreshToken(refreshToken: string | null) {
  if (typeof window === 'undefined') return;
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

function notify() {
  for (const listener of listeners) listener();
}

export function getTokenSnapshot(): TokenSnapshot {
  return snapshot;
}

export function setTokens(tokens: { accessToken: string; refreshToken: string; expiresIn: number }): void {
  snapshot = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  };
  persistRefreshToken(tokens.refreshToken);
  notify();
}

export function clearTokens(): void {
  snapshot = { accessToken: null, refreshToken: null, expiresAt: null };
  persistRefreshToken(null);
  notify();
}

export function subscribeToTokens(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
