'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../state';
import { LoadingState } from '../design-system/components/LoadingState/LoadingState';
import styles from './page.module.css';

/**
 * Guest Steward mode (Production Execution Order): the first Aureus
 * experience must never require an account. An already-authenticated
 * visitor (member or guest) keeps the prior behavior exactly — sent to
 * `/welcome`, which already knows how to fast-path a returning member
 * to `/home` (B2) versus walk a genuine first-run member through
 * arrival. A visitor with no session at all is the one case that used
 * to dead-end at a `/login` redirect (AuthGate); that visitor now
 * silently gets a real guest session — no email, no password, no
 * consent wizard — and lands straight in the conversation surface
 * where "How can we help?" already lives (Gate C hand-off, `/conversation`).
 */
export default function RootPage() {
  const router = useRouter();
  const { session, isRestoring, establishGuestSession } = useSession();
  const [guestError, setGuestError] = useState(false);
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
        if (!cancelled) router.replace('/conversation');
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

  if (guestError) {
    router.replace('/login');
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <LoadingState label="How can we help?" />
    </div>
  );
}
