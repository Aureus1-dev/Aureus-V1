'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJourney, useSession } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import { domainErrorCopy } from '../domain-error-copy';
import { ArrivalRoom, ArrivalStage } from '../arrival';
import { clearArrivalStep } from './arrival-progress';

export interface WelcomeFlowProps {
  /** From `?newMission=true` — opens a fresh Steward conversation. */
  forceNewMission?: boolean;
}

/**
 * Compatibility route for older `/welcome` links.
 *
 * First arrival now belongs to the conversational Hall. A new member is
 * sent to `/conversation`, where Type and Talk are equal entry points and
 * the Steward can gather context progressively. Returning members still
 * resume at Home, and a deliberate "new mission" goes straight to a fresh
 * conversation. The old multi-step arrival form remains available as a
 * component for historical tests and recovery work, but this route no
 * longer places it between a person and asking for help.
 *
 * Goal loading remains an honest routing boundary: if it fails, Aureus
 * says so and offers a retry rather than guessing whether someone is new
 * or returning.
 */
export function WelcomeFlow({ forceNewMission = false }: WelcomeFlowProps) {
  const router = useRouter();
  const { session } = useSession();
  const journey = useJourney();
  const [hadGoalsAtLoad, setHadGoalsAtLoad] = useState<boolean | null>(null);
  const sawLoadingRef = useRef(false);

  if (journey.state.isLoadingGoals) sawLoadingRef.current = true;

  useEffect(() => {
    if (forceNewMission) {
      clearArrivalStep();
      router.replace('/conversation');
      return;
    }
    if (session.isAuthenticated) {
      void journey.loadGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated, forceNewMission, router]);

  useLayoutEffect(() => {
    if (hadGoalsAtLoad === null && sawLoadingRef.current && !journey.state.isLoadingGoals) {
      setHadGoalsAtLoad(journey.state.goals.length > 0);
    }
  }, [hadGoalsAtLoad, journey.state.isLoadingGoals, journey.state.goals.length]);

  useEffect(() => {
    if (forceNewMission || journey.state.error || hadGoalsAtLoad === null) return;
    if (hadGoalsAtLoad) {
      router.replace('/home');
      return;
    }
    clearArrivalStep();
    router.replace('/conversation');
  }, [forceNewMission, hadGoalsAtLoad, journey.state.error, router]);

  function stage() {
    if (journey.state.error && !forceNewMission) {
      const copy = domainErrorCopy(journey.state.error.kind);
      return (
        <ArrivalStage stepKey="error">
          <ErrorState
            title={copy.title}
            description={copy.description}
            action={
              journey.state.error.retryable ? (
                <Button onClick={() => void journey.loadGoals()}>Try again</Button>
              ) : undefined
            }
          />
        </ArrivalStage>
      );
    }

    return (
      <ArrivalStage stepKey="preparing">
        <LoadingState label="Preparing your welcome" />
      </ArrivalStage>
    );
  }

  return <ArrivalRoom>{stage()}</ArrivalRoom>;
}
