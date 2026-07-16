'use client';

import { SessionProvider } from './session/SessionContext';
import { InterfaceProvider } from './interface/InterfaceContext';
import { PreferencesProvider } from './preferences/PreferencesContext';
import { ConversationProvider } from './conversation/ConversationContext';
import { JourneyProvider } from './journey/JourneyContext';
import { OpportunitiesProvider } from './opportunities/OpportunitiesContext';
import { RecommendationsProvider } from './recommendations/RecommendationsContext';

/**
 * Composes the full state foundation (FPB-010 §3). Every domain provider
 * below PreferencesProvider needs the member's access token (FPB-009),
 * so all are nested inside SessionProvider.
 */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InterfaceProvider>
        <PreferencesProvider>
          <ConversationProvider>
            <JourneyProvider>
              <OpportunitiesProvider>
                <RecommendationsProvider>{children}</RecommendationsProvider>
              </OpportunitiesProvider>
            </JourneyProvider>
          </ConversationProvider>
        </PreferencesProvider>
      </InterfaceProvider>
    </SessionProvider>
  );
}
