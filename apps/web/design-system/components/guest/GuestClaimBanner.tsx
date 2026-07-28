'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from '../../../state';
import { Button } from '../Button/Button';
import styles from './GuestClaimBanner.module.css';

/**
 * Progressive account creation (Production Execution Order, Part 3):
 * authentication is never the first thing a visitor sees, and it is
 * never forced — it is offered, naturally, once there is something
 * real to keep. Mounted once in the member layout (the same pattern
 * `UrgentHelpAffordance` and `StewardWorkspace` already use for
 * persistent, non-blocking chrome) so every guest surface carries it
 * without per-page wiring, and it renders nothing at all for an
 * already-claimed member session.
 *
 * Deliberately a single, calm, dismissible banner rather than a
 * separate bespoke prompt wired into each individual "save/continue
 * later/personalize/Marks/Journey/sync" moment LAUNCH-001 and the
 * Production Execution Order name — those are all, at heart, the same
 * underlying fact (this is a guest session with no account behind it
 * yet), and a single honest, always-visible offer serves all of them
 * without scattering near-duplicate copy and near-duplicate logic
 * across the app.
 */
export function GuestClaimBanner() {
  const { session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  if (!session.isGuest || dismissed) {
    return null;
  }

  return (
    <div className={styles.banner} role="status">
      <p className={styles.message}>
        It looks like we&apos;ve built something worth keeping. Would you like to create your
        free account so I can save everything we&apos;ve worked on?
      </p>
      <div className={styles.actions}>
        <Link href="/register">
          <Button type="button" variant="primary">
            Create free account
          </Button>
        </Link>
        <button type="button" className={styles.dismiss} onClick={() => setDismissed(true)}>
          Not now
        </button>
      </div>
    </div>
  );
}
