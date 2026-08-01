'use client';

import { useEffect } from 'react';
import { useJourney, useSession } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
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
    // The Founder Pilot branch wrapped this empty state in `ArrivalRoom`
    // to stop Home reading as one small card in an empty field. That was
    // right when `ArrivalRoom` was a soft panel; it is wrong now that it
    // is the full architectural Hall, because `/home` is not an arrival
    // surface and keeps `AppShell`'s padding — so the room would render
    // as a bordered panel inside a page, which AUREUS-201 forbids
    // outright: "The Hall itself is never represented as a floating
    // panel."
    //
    // The heading fix from that branch is kept. Whether Home's empty
    // state should itself become a full-bleed Hall surface is a
    // genuine experience decision, not an integration detail, so it is
    // raised for the Founder rather than decided here.
    return (
      <EmptyState
        titleAs="h1"
        title="Let's get started"
        description="You don't have a mission yet — begin at Welcome to set your first goal."
        action={<LinkButton href="/welcome">Go to Welcome</LinkButton>}
      />
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
