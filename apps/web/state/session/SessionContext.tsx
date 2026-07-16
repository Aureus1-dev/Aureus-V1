'use client';

import { createContext, useContext, useMemo, useState } from 'react';

/**
 * Session State (FPB-010 §3 "Session State"). `accessToken` fills in
 * FPB-010 §3's "Authentication" category so authenticated backend calls
 * (FPB-009) are possible — no login/authentication flow itself is
 * implemented here; a member's session is expected to be populated by a
 * future authentication Work Order.
 */
export interface SessionState {
  isAuthenticated: boolean;
  accessToken: string | null;
  memberId: string | null;
  permissions: string[];
  connectedServices: string[];
  activeWorkflowId: string | null;
}

interface SessionContextValue {
  session: SessionState;
  setSession: (session: SessionState) => void;
}

const initialSessionState: SessionState = {
  isAuthenticated: false,
  accessToken: null,
  memberId: null,
  permissions: [],
  connectedServices: [],
  activeWorkflowId: null,
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>(initialSessionState);
  const value = useMemo(() => ({ session, setSession }), [session]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
