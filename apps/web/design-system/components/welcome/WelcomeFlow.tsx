'use client';

import { useEffect } from 'react';
import { useJourney } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { FirstRunWelcome } from './FirstRunWelcome';
import { ReturningWelcome } from './ReturningWelcome';
import styles from './WelcomeFlow.module.css';

/**
 * Welcome — the front door of Aureus (Founder Decision: Welcome
 * composes the rest of the Core Member Journey Domain). Branches
 * between a first-run guided flow and a calm returning-member summary,
 * since a member should never be forced through onboarding twice
 * (AFX-005 §3).
 */
export function WelcomeFlow() {
  const journey = useJourney();

  useEffect(() => {
    void journey.loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (journey.state.isLoadingGoals) {
    return (
      <div className={styles.loading}>
        <LoadingState label="Preparing your welcome" />
      </div>
    );
  }

  if (journey.state.goals.length > 0) {
    return <ReturningWelcome goals={journey.state.goals} />;
  }

  return <FirstRunWelcome />;
}
