'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJourney, useSession } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import { domainErrorCopy } from '../domain-error-copy';
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
 *
 * B8 (Gate B — The Gate): if loading goals fails (network/session/service
 * failure), we genuinely do not know whether this member is new or
 * returning — silently falling through to `FirstRunWelcome` would show a
 * returning member the whole onboarding wizard again, an honesty failure
 * (implying "you have no history here" when we simply couldn't check).
 * An honest, retryable error is shown instead. `forceNewMission` is exempt:
 * the member already explicitly chose to start a new mission, so whether
 * their prior goals loaded is irrelevant to what they asked for.
 *
 * "Returning" is decided from a one-time snapshot taken when the initial
 * `loadGoals()` call settles, not from the live `journey.state.goals`
 * count — a first-time member's very first Goal is created by
 * `FirstRunWelcome` itself, from within this same mount, partway through
 * onboarding; reading the live count here would misidentify that as "a
 * member who already had goals," redirecting them to Home mid-arrival,
 * before they ever reach First Mission, the Coordinated Plan, or the
 * Stewardship Offer — a real, confirmed defect this doc-comment exists to
 * prevent regressing (found via a live dry run, not a unit test: nothing
 * in the existing suite ever mounted `WelcomeFlow` through a full
 * immediate-need-to-mission flow with a real `JourneyContext`).
 */
export function WelcomeFlow({ forceNewMission = false }: WelcomeFlowProps) {
  const router = useRouter();
  const { session } = useSession();
  const journey = useJourney();
  const [hasIncompleteArrival] = useState(() => readArrivalStep() !== null);
  const [hadGoalsAtLoad, setHadGoalsAtLoad] = useState<boolean | null>(null);
  // `isLoadingGoals` starts `false` (no fetch is in flight yet at mount),
  // so "not loading" is trivially true before `loadGoals()` has even been
  // called — this ref distinguishes "genuinely settled" from "just
  // hasn't started," so the snapshot below isn't taken prematurely.
  const sawLoadingRef = useRef(false);
  if (journey.state.isLoadingGoals) sawLoadingRef.current = true;

  useEffect(() => {
    if (session.isAuthenticated) {
      void journey.loadGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated]);

  // Layout effect, not a plain effect: this must resolve before the
  // browser paints, or a genuinely returning member would flash the
  // onboarding wizard for one frame before being redirected.
  useLayoutEffect(() => {
    if (hadGoalsAtLoad === null && sawLoadingRef.current && !journey.state.isLoadingGoals) {
      setHadGoalsAtLoad(journey.state.goals.length > 0);
    }
  }, [hadGoalsAtLoad, journey.state.isLoadingGoals, journey.state.goals.length]);

  const isReturningMember = Boolean(hadGoalsAtLoad) && !hasIncompleteArrival;

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

  if (journey.state.error && !forceNewMission) {
    const copy = domainErrorCopy(journey.state.error.kind);
    return (
      <div className={styles.loading}>
        <ErrorState
          title={copy.title}
          description={copy.description}
          action={
            journey.state.error.retryable ? (
              <Button onClick={() => void journey.loadGoals()}>Try again</Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return <FirstRunWelcome skipHospitality={forceNewMission} />;
}
