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
import { ConnectedExperiencesProvider } from './connected-experiences/ConnectedExperiencesContext';
import { ProfileProvider } from './profile/ProfileContext';
import { TasksProvider } from './tasks/TasksContext';
import { PodsProvider } from './pods/PodsContext';
import { ResourcesProvider } from './resources/ResourcesContext';
import { MessagesProvider } from './messages/MessagesContext';
import { FounderProvider } from './founder/FounderContext';
import { ReviewQueueProvider } from './review-queue/ReviewQueueContext';
import { StewardshipOversightProvider } from './stewardship-oversight/StewardshipOversightContext';
import { AnnouncementsProvider } from './announcements/AnnouncementsContext';

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
                        <AcademyProvider>
                          <ConnectedExperiencesProvider>
                            <ProfileProvider>
                              <TasksProvider>
                                <PodsProvider>
                                  <ResourcesProvider>
                                    <MessagesProvider>
                                      <FounderProvider>
                                        <ReviewQueueProvider>
                                          <StewardshipOversightProvider>
                                            <AnnouncementsProvider>{children}</AnnouncementsProvider>
                                          </StewardshipOversightProvider>
                                        </ReviewQueueProvider>
                                      </FounderProvider>
                                    </MessagesProvider>
                                  </ResourcesProvider>
                                </PodsProvider>
                              </TasksProvider>
                            </ProfileProvider>
                          </ConnectedExperiencesProvider>
                        </AcademyProvider>
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
