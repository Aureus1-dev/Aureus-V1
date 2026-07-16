'use client';

import { SessionProvider } from './session/SessionContext';
import { InterfaceProvider } from './interface/InterfaceContext';
import { PreferencesProvider } from './preferences/PreferencesContext';
import { ConversationProvider } from './conversation/ConversationContext';
import { JourneyProvider } from './journey/JourneyContext';
import { OpportunitiesProvider } from './opportunities/OpportunitiesContext';
import { RecommendationsProvider } from './recommendations/RecommendationsContext';
import { VoiceProvider } from './voice/VoiceContext';
import { NotificationsProvider } from './notifications/NotificationsContext';

/**
 * Composes the full state foundation (FPB-010 §3). Every domain provider
 * below PreferencesProvider needs the member's access token (FPB-009),
 * so all are nested inside SessionProvider. VoiceProvider nests inside
 * ConversationProvider — voice and text share one canonical conversation
 * (DOMAIN-002), so the Voice surface can read/refresh the same
 * conversation state text does (text ↔ voice continuity).
 */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InterfaceProvider>
        <PreferencesProvider>
          <ConversationProvider>
            <VoiceProvider>
              <JourneyProvider>
                <OpportunitiesProvider>
                  <RecommendationsProvider>
                    <NotificationsProvider>{children}</NotificationsProvider>
                  </RecommendationsProvider>
                </OpportunitiesProvider>
              </JourneyProvider>
            </VoiceProvider>
          </ConversationProvider>
        </PreferencesProvider>
      </InterfaceProvider>
    </SessionProvider>
  );
}
