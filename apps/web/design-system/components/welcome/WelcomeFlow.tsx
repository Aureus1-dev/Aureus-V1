'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJourney, useSession } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { FirstRunWelcome } from './FirstRunWelcome';
import { readArrivalStep } from './arrival-progress';
import styles from './WelcomeFlow.module.css';

export interface WelcomeFlowProps {
  /** From `?newMission=true` — the escape hatch a returning member's "Start a new mission" action uses to reach the guided flow again without being redirected to Home first. */
  forceNewMission?: boolean;
}

/**
 * Welcome — the front door of Aureus, for first-run members only
 * (DOMAIN-003 Founder Decision 1). A returning member (one who already
 * has goals) is redirected to Home instead of shown a second summary
 * screen here, since a member should never be forced through onboarding
 * twice (AFX-005 §3) and "every return begins where the previous
 * journey paused" (FPB-003 §10) — that resumption point is Home, not
 * Welcome.
 *
 * B6 (Gate B — The Gate): a member who created a first Goal but left
 * mid-guided-flow (never reached the final summary) has `goals.length
 * > 0` yet has not actually finished onboarding — redirecting them to
 * Home here would silently skip the rest of arrival (Opportunities,
 * Review & Approval) and count as "data loss" of their in-progress
 * position. `hasIncompleteArrival` (a persisted step from
 * `arrival-progress.ts`) overrides the returning-member redirect in
 * exactly that case, so `FirstRunWelcome` mounts and resumes them
 * instead.
 */
export function WelcomeFlow({ forceNewMission = false }: WelcomeFlowProps) {
  const router = useRouter();
  const { session } = useSession();
  const journey = useJourney();
  const [hasIncompleteArrival] = useState(() => readArrivalStep() !== null);

  useEffect(() => {
    if (session.isAuthenticated) {
      void journey.loadGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated]);

  const isReturningMember = journey.state.goals.length > 0 && !hasIncompleteArrival;

  useEffect(() => {
    if (!journey.state.isLoadingGoals && isReturningMember && !forceNewMission) {
      router.replace('/home');
    }
  }, [journey.state.isLoadingGoals, isReturningMember, forceNewMission, router]);

  if (journey.state.isLoadingGoals || (isReturningMember && !forceNewMission)) {
    return (
      <div className={styles.loading}>
        <LoadingState label="Preparing your welcome" />
      </div>
    );
  }

  return <FirstRunWelcome skipHospitality={forceNewMission} />;
}
