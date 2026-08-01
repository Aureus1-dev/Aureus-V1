'use client';

import { useEffect, useState } from 'react';
import { useJourney, useSession } from '../../../state';
import { LinkButton } from '../Button/LinkButton';
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
 *
 * Privacy philosophy: the second line is deliberately specific, not
 * vague reassurance — a guest who never claims an account has their
 * conversation, needs, and progress genuinely, permanently deleted once
 * inactive (`GuestLifecycleService`), not held indefinitely on the
 * chance they return. The offer is framed entirely around preserving
 * that progress across time and devices, never around unlocking
 * anything — nothing here is otherwise restricted to a guest.
 */
export function GuestClaimBanner() {
  const { session } = useSession();
  const journey = useJourney();
  const [dismissed, setDismissed] = useState(false);

  // "It looks like we've built something worth keeping" has to be true
  // when it is said. Shown on arrival it was addressed to someone who had
  // done nothing yet — the first sentence of the product describing work
  // that did not exist. The offer waits until there is something real to
  // preserve: the member's first goal. Until then Aureus asks for
  // nothing, which is also what Guest Steward mode promises.
  // Loaded here rather than relied upon from elsewhere: this banner
  // renders on every member surface, and most of them never call
  // loadGoals(), so depending on another component having done it would
  // mean the offer silently never appears. JourneyContext de-duplicates,
  // so this costs nothing where a surface already loads them.
  useEffect(() => {
    if (session.isAuthenticated) void journey.loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated]);

  const hasSomethingWorthKeeping = journey.state.goals.length > 0;

  if (!session.isGuest || dismissed || !hasSomethingWorthKeeping) {
    return null;
  }

  return (
    <div className={styles.banner} role="status">
      <p className={styles.message}>
        It looks like we&apos;ve built something worth keeping. Would you like to create your
        free account so I can save everything we&apos;ve worked on?
        {' '}
        <span className={styles.detail}>
          Without one, this conversation and everything in it stays only as long as you&apos;re
          actively using it — it isn&apos;t kept forever, and it won&apos;t follow you to another
          device.
        </span>
      </p>
      <div className={styles.actions}>
        {/*
          A link that looks like a button, not a button inside a link.
          The previous `<Link><Button/></Link>` nested interactive content
          inside an anchor, which is invalid HTML: it produced two
          separate tab stops both announcing "Create free account", so a
          keyboard member pressed Tab twice for one action and a screen
          reader announced the same control twice. Borrowing the button's
          own classes keeps the appearance identical with one real
          control — and "go to the registration page" is navigation, so an
          anchor is the correct element regardless.
        */}
        <LinkButton href="/register">Create free account</LinkButton>
        <button type="button" className={styles.dismiss} onClick={() => setDismissed(true)}>
          Not now
        </button>
      </div>
    </div>
  );
}
