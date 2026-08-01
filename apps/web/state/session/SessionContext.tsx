'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../../lib/api/auth';
import { configureAuthBridge } from '../../lib/api/http';
import { decodeAccessToken } from '../../lib/auth/decode-access-token';
import { refreshAccessToken } from '../../lib/auth/session-bridge';
import { clearTokens, getTokenSnapshot, setTokens, subscribeToTokens } from '../../lib/auth/token-store';

/**
 * Session State (FPB-010 §3 "Session State"). The token-bearing fields
 * (`isAuthenticated`, `accessToken`, `memberId`, `email`, `roles`) are
 * kept in sync with `lib/auth/token-store` — the real source of truth,
 * since `lib/api/http.ts` (not a React component) also needs the current
 * token. `setSession` remains a direct escape hatch for callers that
 * need to set arbitrary session fields (e.g. `permissions`), independent
 * of the authentication lifecycle.
 */
export interface SessionState {
  isAuthenticated: boolean;
  accessToken: string | null;
  memberId: string | null;
  email: string | null;
  roles: string[];
  permissions: string[];
  connectedServices: string[];
  activeWorkflowId: string | null;
  /**
   * Guest Steward mode. True for a session started by `establishGuestSession`
   * (no account, no password) — read straight from the access token's own
   * claims (see `decodeAccessToken`), never re-derived elsewhere, so it can
   * never drift from what the backend actually issued.
   */
  isGuest: boolean;
}

interface SessionContextValue {
  session: SessionState;
  setSession: (session: SessionState) => void;
  /** True until the initial silent session-restoration attempt completes. */
  isRestoring: boolean;
  /** True when a previously active session could not be silently restored (refresh failed). */
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Guest Steward mode: starts an unauthenticated session with no email or
   * password. The first Aureus experience must never require an account —
   * this is what the guest landing surface calls before it ever shows
   * "How can we help?".
   */
  establishGuestSession: () => Promise<void>;
  /**
   * Claims the current guest session by attaching a real email/password to
   * the SAME account — same id, so every conversation, need, and goal the
   * guest already built is preserved with no separate migration step.
   */
  claimAccount: (email: string, password: string) => Promise<void>;
}

const initialSessionState: SessionState = {
  isAuthenticated: false,
  accessToken: null,
  memberId: null,
  email: null,
  roles: [],
  permissions: [],
  connectedServices: [],
  activeWorkflowId: null,
  isGuest: false,
};

function withTokenSnapshot(previous: SessionState): SessionState {
  const { accessToken } = getTokenSnapshot();
  if (!accessToken) {
    return {
      ...previous,
      isAuthenticated: false,
      accessToken: null,
      memberId: null,
      email: null,
      roles: [],
      isGuest: false,
    };
  }
  const claims = decodeAccessToken(accessToken);
  return {
    ...previous,
    isAuthenticated: true,
    accessToken,
    memberId: claims?.sub ?? null,
    email: claims?.email ?? null,
    roles: claims?.roles ?? [],
    isGuest: claims?.isGuest === true,
  };
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>(initialSessionState);
  const [isRestoring, setIsRestoring] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    configureAuthBridge({
      refreshAndRetry: async () => {
        const hadRefreshToken = !!getTokenSnapshot().refreshToken;
        const newAccessToken = await refreshAccessToken();
        setSession((previous) => withTokenSnapshot(previous));
        if (!newAccessToken && hadRefreshToken) {
          setSessionExpired(true);
        }
        return newAccessToken;
      },
    });
    return () => configureAuthBridge(null);
  }, []);

  useEffect(() => subscribeToTokens(() => setSession((previous) => withTokenSnapshot(previous))), []);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const { refreshToken } = getTokenSnapshot();
      if (refreshToken) {
        const restored = await refreshAccessToken();
        if (!cancelled) {
          setSession((previous) => withTokenSnapshot(previous));
          // A refresh token was on disk and the server refused it, so
          // this browser belongs to a member whose session ended — not
          // to a new visitor. Saying so is what stops `RootPage` and
          // `AuthGate` from silently minting a fresh guest identity and
          // orphaning everything that member already built.
          //
          // Previously the flag was only ever set by the auth bridge,
          // which runs on a 401 *during* a request and therefore never
          // on the cold load that follows a browser restart, an expired
          // token, or a second tab having already rotated it. That cold
          // load is exactly when a returning member arrives, so the
          // guards existed but could not fire on the path that mattered.
          if (!restored) {
            setSessionExpired(true);
          }
        }
      }
      if (!cancelled) {
        setIsRestoring(false);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { tokens } = await authApi.login(email, password);
    setTokens(tokens);
    setSessionExpired(false);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { tokens } = await authApi.register(email, password);
    setTokens(tokens);
    setSessionExpired(false);
  }, []);

  const establishGuestSession = useCallback(async () => {
    const { tokens } = await authApi.guest();
    setTokens(tokens);
    setSessionExpired(false);
  }, []);

  const claimAccount = useCallback(async (email: string, password: string) => {
    const { accessToken } = getTokenSnapshot();
    if (!accessToken) {
      throw new Error('No active session to claim');
    }
    const { tokens } = await authApi.claimGuestAccount(accessToken, email, password);
    setTokens(tokens);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(async () => {
    const { refreshToken } = getTokenSnapshot();
    clearTokens();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Best-effort server-side revocation — the local session is already cleared.
      }
    }
  }, []);

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), []);

  const value = useMemo(
    () => ({
      session,
      setSession,
      isRestoring,
      sessionExpired,
      dismissSessionExpired,
      login,
      register,
      logout,
      establishGuestSession,
      claimAccount,
    }),
    [
      session,
      isRestoring,
      sessionExpired,
      dismissSessionExpired,
      login,
      register,
      logout,
      establishGuestSession,
      claimAccount,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
