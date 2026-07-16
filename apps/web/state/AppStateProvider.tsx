'use client';

import { SessionProvider } from './session/SessionContext';
import { InterfaceProvider } from './interface/InterfaceContext';
import { PreferencesProvider } from './preferences/PreferencesContext';
import { ConversationProvider } from './conversation/ConversationContext';

/**
 * Composes the full state foundation (FPB-010 §3). ConversationProvider
 * is nested inside SessionProvider because it needs the member's access
 * token to call the AI Conversations service (FPB-009).
 */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InterfaceProvider>
        <PreferencesProvider>
          <ConversationProvider>{children}</ConversationProvider>
        </PreferencesProvider>
      </InterfaceProvider>
    </SessionProvider>
  );
}
