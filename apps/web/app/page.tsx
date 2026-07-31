'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../state';
import { ArrivalScene } from '../design-system/components/arrival';

/**
 * Guest Steward mode (Production Execution Order): the first Aureus
 * experience must never require an account. An already-authenticated
 * visitor (member or guest) keeps the prior behavior exactly — sent to
 * `/welcome`, which already knows how to fast-path a returning member
 * to `/home` (B2) versus walk a genuine first-run member through
 * arrival. A visitor with no session at all is the one case that used
 * to dead-end at a `/login` redirect (AuthGate); that visitor now
 * silently gets a real guest session — no email, no password, no
 * consent wizard — while the Opening Sequence (AUREA-002 Arrival Canon)
 * plays, then lands in the conversation surface where "How can we help?"
 * already lives (Gate C hand-off, `/conversation`). Navigation waits on
 * both the guest session and the sequence, so a fast network never cuts
 * the arrival experience short, and a slow one never gets stuck on a
 * bare spinner — the sequence's resting frame carries the wait.
 */
export default function RootPage() {
  const router = useRouter();
  const { session, isRestoring, establishGuestSession } = useSession();
  const [guestError, setGuestError] = useState(false);
  const [guestReady, setGuestReady] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (isRestoring) return;

    if (session.isAuthenticated) {
      router.replace('/welcome');
      return;
    }

    if (attempted.current) return;
    attempted.current = true;

    let cancelled = false;
    void establishGuestSession()
      .then(() => {
        if (!cancelled) setGuestReady(true);
      })
      .catch(() => {
        // A guest session could not be started (e.g. the API is
        // unreachable) — fall back to the existing sign-in path rather
        // than stranding the visitor on a blank screen.
        if (!cancelled) setGuestError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isRestoring, session.isAuthenticated, establishGuestSession, router]);

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

  if (guestError) return null;

  return <ArrivalScene onFinished={() => setIntroFinished(true)} />;
}
