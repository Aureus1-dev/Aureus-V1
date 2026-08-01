'use client';

import { useEffect } from 'react';
import { useJourney, useSession } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
import { HomeHall } from './HomeHall';
import { LoadingState } from '../LoadingState/LoadingState';
import { Greeting } from './Greeting';
import { QuickActions } from './QuickActions';
import { JourneySection } from './JourneySection';
import { OpportunityHighlights } from './OpportunityHighlights';
import { ConversationShortcut } from './ConversationShortcut';
import { NotificationsSection } from './NotificationsSection';
import styles from './HomeDashboard.module.css';

/**
 * Home — the member's returning landing surface (DOMAIN-003), distinct
 * from Welcome's first-run front door. "Every return begins where the
 * previous journey paused" (FPB-003 §10). Composes existing domain
 * contexts (Journey, Opportunities, Conversation) rather than
 * duplicating their state (FPB-010 §7).
 */
export function HomeDashboard() {
  const { session } = useSession();
  const { state: journeyState, loadGoals } = useJourney();

  useEffect(() => {
    if (session.isAuthenticated) {
      void loadGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated]);

  if (!session.isAuthenticated) {
    return (
      <EmptyState
        titleAs="h1"
        title="Sign in to see your Home"
        description="Home is where your Aureus journey picks up each time you return."
      />
    );
  }

  if (journeyState.isLoadingGoals) {
    return (
      <div className={styles.loading}>
        <LoadingState label="Preparing your Home" />
      </div>
    );
  }

  if (journeyState.goals.length === 0) {
    // Founder decision: with no active mission, Home *is* the Hall —
    // full-bleed, hearth, "How can we help?", one input. Not a card, not
    // an empty-state illustration, not a menu of rooms.
    return <HomeHall />;
  }

  return (
    <div className={styles.dashboard}>
      <Greeting />
      <div className={styles.grid}>
        <div className={styles.primary}>
          <JourneySection />
          <OpportunityHighlights />
        </div>
        <div className={styles.secondary}>
          <QuickActions />
          <ConversationShortcut />
          <NotificationsSection />
        </div>
      </div>
    </div>
  );
}
