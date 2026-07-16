'use client';

import { createContext, useContext, useMemo, useState } from 'react';

/**
 * Session State (FPB-010 §3 "Session State"). Foundation-phase shape
 * only — populated with real values once authentication (FPB-009 §5)
 * is integrated in a later work order. No live backend calls occur here.
 */
export interface SessionState {
  isAuthenticated: boolean;
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
