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
import { HighlightRegistryProvider } from './highlight/HighlightRegistryContext';
import { AcademyProvider } from './academy/AcademyContext';

/**
 * Composes the full state foundation (FPB-010 §3). Every domain provider
 * below PreferencesProvider needs the member's access token (FPB-009),
 * so all are nested inside SessionProvider. VoiceProvider nests inside
 * ConversationProvider — voice and text share one canonical conversation
 * (DOMAIN-002), so the Voice surface can read/refresh the same
 * conversation state text does (text ↔ voice continuity).
 *
 * `HighlightRegistryProvider` wraps everything, outermost: it holds no
 * session/auth state of its own (a pure DOM-ref bookkeeping primitive,
 * DOMAIN-005 Founder Decision 4), and both `VoiceOrchestrator` (which
 * activates targets) and every domain screen (which registers them) need
 * to reach it.
 */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  return (
    <HighlightRegistryProvider>
      <SessionProvider>
        <InterfaceProvider>
          <PreferencesProvider>
            <ConversationProvider>
              <VoiceProvider>
                <JourneyProvider>
                  <OpportunitiesProvider>
                    <RecommendationsProvider>
                      <NotificationsProvider>
                        <AcademyProvider>{children}</AcademyProvider>
                      </NotificationsProvider>
                    </RecommendationsProvider>
                  </OpportunitiesProvider>
                </JourneyProvider>
              </VoiceProvider>
            </ConversationProvider>
          </PreferencesProvider>
        </InterfaceProvider>
      </SessionProvider>
    </HighlightRegistryProvider>
  );
}
