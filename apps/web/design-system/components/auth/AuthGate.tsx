'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import styles from './AuthGate.module.css';

export interface AuthGateProps {
  children: ReactNode;
}

/**
 * Guards every member surface (FPB-002's 20 primary experiences) — but
 * "guards" no longer means "requires an account." Guest Steward mode:
 * Opportunity Center, resource matching, journey building, and every
 * other member surface must never dead-end at a login wall for a
 * genuinely first-time visitor, including one who lands directly on
 * `/opportunities`, `/journey`, `/resources`, etc. without ever passing
 * through the root landing page (a shared link, a bookmark, a search
 * result). A visitor with no session at all now silently receives a
 * guest session here, the same way the root page does for its own
 * narrower "How can we help?" first-touch case — this is the general
 * form of that same fix, covering every entry point, not only `/`.
 *
 * `sessionExpired` (a session that existed and failed to refresh) is
 * deliberately handled differently: silently re-guesting someone whose
 * real member session just expired would quietly drop them into
 * anonymous browsing instead of prompting them back into their own
 * account, which is worse, not more helpful. That case still goes to
 * `/login?expired=1`, unchanged — `LoginForm` itself offers a "Continue
 * without an account" way back in for the guest edge of that path.
 */
export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const { session, isRestoring, sessionExpired, establishGuestSession } = useSession();
  const attemptedGuest = useRef(false);

  useEffect(() => {
    if (isRestoring || session.isAuthenticated) return;

    if (sessionExpired) {
      router.replace('/login?expired=1');
      return;
    }

    if (attemptedGuest.current) return;
    attemptedGuest.current = true;

    let cancelled = false;
    void establishGuestSession().catch(() => {
      if (!cancelled) router.replace('/login');
    });
    return () => {
      cancelled = true;
    };
  }, [isRestoring, session.isAuthenticated, sessionExpired, establishGuestSession, router]);

  if (isRestoring || (!session.isAuthenticated && !sessionExpired)) {
    return (
      <div className={styles.wrapper}>
        <LoadingState label="Preparing your session" />
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
