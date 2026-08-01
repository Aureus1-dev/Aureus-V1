'use client';

import { useEffect } from 'react';
import { useJourney, useSession } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
import { ArrivalRoom, ArrivalStage } from '../arrival';
import { LoadingState } from '../LoadingState/LoadingState';
import { LinkButton } from '../Button/LinkButton';
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
    // A member with no mission yet was met by a single small card in an
    // otherwise empty field. Home is the Hall (AUREUS-003) — so before
    // there is anything to show, the room itself is what welcomes them,
    // rather than an empty dashboard implying something is missing.
    return (
      <ArrivalRoom>
        <ArrivalStage stepKey="home-empty">
          <EmptyState
            titleAs="h1"
            title="Let's get started"
            description="You don't have a mission yet — begin at Welcome to set your first goal."
            action={<LinkButton href="/welcome">Go to Welcome</LinkButton>}
          />
        </ArrivalStage>
      </ArrivalRoom>
    );
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
