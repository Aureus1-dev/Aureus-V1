'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../state';
import {
  ArrivalScene,
  ArrivalRoom,
  ArrivalStage,
  ARRIVAL_CAPACITY_TITLE,
  ARRIVAL_CAPACITY_DESCRIPTION,
} from '../design-system/components/arrival';
import { ErrorState } from '../design-system/components/ErrorState/ErrorState';
import { Button } from '../design-system/components/Button/Button';
import { ApiError } from '../lib/api/errors';

/**
 * Guest Steward mode (Production Execution Order): the first Aureus
 * experience must never require an account. An already-authenticated
 * visitor (member or guest) enters the same conversation surface as a
 * newly established guest. Arrival is progressive and conversational:
 * nobody is diverted into a form before they can ask for help. A visitor
 * with no session at all is the one case that used
 * to dead-end at a `/login` redirect (AuthGate); that visitor now
 * silently gets a real guest session — no email, no password, no
 * consent wizard — while the Opening Sequence (AUREA-002 Arrival Canon)
 * plays, then lands in the conversation surface where "How can we help?"
 * already lives (Gate C hand-off, `/conversation`). Navigation waits on
 * both the guest session and the sequence, so a fast network never cuts
 * the arrival experience short, and a slow one never gets stuck on a
 * bare spinner — the sequence's resting frame carries the wait.
 *
 * A visitor whose session expired is deliberately none of the above: see
 * the `sessionExpired` branch below, which exists so a returning member
 * is never silently replaced by a new guest identity.
 */
export default function RootPage() {
  const router = useRouter();
  const { session, isRestoring, sessionExpired, establishGuestSession } = useSession();
  const [guestError, setGuestError] = useState(false);
  const [atCapacity, setAtCapacity] = useState(false);
  const [guestReady, setGuestReady] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const attempted = useRef(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (isRestoring) return;

    if (session.isAuthenticated) {
      router.replace('/conversation');
      return;
    }

    // A session that existed and failed to refresh is NOT a new visitor.
    // Silently guesting them here hands their browser a brand-new
    // identity and orphans everything they already built — the goals,
    // journey and conversations all still exist, attached to a member
    // they can no longer reach. `AuthGate` has always drawn this
    // distinction on every other surface; the root page did not, which
    // made "/" the one door where a returning member could be quietly
    // replaced by a stranger. Same rule, same destination, same
    // explanation the rest of the app already gives ("Your session has
    // ended", rendered by `LoginForm` from `?expired=1`).
    if (sessionExpired) {
      router.replace('/login?expired=1');
      return;
    }

    if (attempted.current) return;
    attempted.current = true;

    let cancelled = false;
    void establishGuestSession()
      .then(() => {
        if (!cancelled) setGuestReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // The front door being busy is not the same failure as the API
        // being unreachable. A visitor turned away by the rate limit is
        // told so, in the Hall, with a way to try again — never bounced
        // to a login wall on a product that promises no account is
        // required to ask for help.
        if (error instanceof ApiError && error.isRateLimited) {
          setAtCapacity(true);
          return;
        }
        // Any other failure (e.g. the API is unreachable) keeps the
        // existing sign-in fallback rather than stranding the visitor on
        // a blank screen.
        setGuestError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [
    isRestoring,
    session.isAuthenticated,
    sessionExpired,
    establishGuestSession,
    router,
    retryToken,
  ]);

  useEffect(() => {
    if (guestReady && introFinished) router.replace('/conversation');
  }, [guestReady, introFinished, router]);

  // A separate effect, not a render-time call: redirecting during render
  // triggers React's "Cannot update a component while rendering a
  // different component" warning, since it updates the router's state
  // as a side effect of RootPage's own render.
  useEffect(() => {
    if (guestError) router.replace('/login');
  }, [guestError, router]);

  if (guestError || sessionExpired) return null;

  if (atCapacity) {
    return (
      <ArrivalRoom>
        <ArrivalStage stepKey="at-capacity">
          <ErrorState
            title={ARRIVAL_CAPACITY_TITLE}
            description={ARRIVAL_CAPACITY_DESCRIPTION}
            action={
              <Button
                type="button"
                onClick={() => {
                  setAtCapacity(false);
                  attempted.current = false;
                  setRetryToken((n) => n + 1);
                }}
              >
                Try again
              </Button>
            }
          />
        </ArrivalStage>
      </ArrivalRoom>
    );
  }

  return <ArrivalScene onFinished={() => setIntroFinished(true)} />;
}
