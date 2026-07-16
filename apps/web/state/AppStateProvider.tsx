'use client';

import { SessionProvider } from './session/SessionContext';
import { InterfaceProvider } from './interface/InterfaceContext';
import { PreferencesProvider } from './preferences/PreferencesContext';

/**
 * Composes the Phase One state foundation. Conversation State (FPB-010
 * §3) is intentionally excluded until the Conversation Engine is
 * integrated in a later work order (FPB-015 Phase Two).
 */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InterfaceProvider>
        <PreferencesProvider>{children}</PreferencesProvider>
      </InterfaceProvider>
    </SessionProvider>
  );
}
