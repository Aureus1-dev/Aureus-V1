'use client';

import { Composer } from './Composer';
import { StoryRail } from './StoryRail';
import { UrgentSafetyNotice } from './UrgentSafetyNotice';
import { STEWARDSHIP_STORIES } from './engine/fixtures';
import type { ArrivalMode } from './engine/types';
import styles from './ArrivalView.module.css';

export interface ArrivalViewProps {
  mode: ArrivalMode;
  onSubmit: (text: string, attachments: string[]) => void;
  onRequestUrgent: () => void;
  /** Present only for the "returning member, nothing active" state (addendum §6.3). */
  returningMemberName?: string;
}

/**
 * State A/urgent variant (portfolio §6 State A; addendum §4). No sign-in
 * wall, one hero promise, one composer. Stories recede in urgent mode so
 * proof never becomes friction for someone who needs help right now
 * (addendum §4.2, "Urgent entry may bypass stories").
 */
export function ArrivalView({
  mode,
  onSubmit,
  onRequestUrgent,
  returningMemberName,
}: ArrivalViewProps) {
  const urgent = mode === 'urgent';

  return (
    <div className={styles.arrival}>
      <header className={styles.topBar}>
        <span className={styles.wordmark}>Aureus</span>
        {returningMemberName ? (
          <span className={styles.returningGreeting}>Welcome back, {returningMemberName}.</span>
        ) : (
          <a href="/login" className={styles.signIn}>
            Sign in
          </a>
        )}
      </header>

      <main id="main-content" className={styles.hero}>
        <p className={styles.promise}>
          Tell Aureus what you want to accomplish.
          <br />
          Aureus figures out how to get it done.
        </p>
        <h1 className={styles.invitation}>How can we help?</h1>

        <div className={styles.composerWrap}>
          <Composer
            onSubmit={onSubmit}
            placeholder="Tell us what you need, what happened, or what you're trying to get done."
            autoFocus
          />
        </div>

        {urgent ? (
          <UrgentSafetyNotice />
        ) : (
          <div className={styles.footerRow}>
            <p className={styles.reassurance}>You can start without an account.</p>
            <button type="button" className={styles.urgentLink} onClick={onRequestUrgent}>
              I need help right now
            </button>
          </div>
        )}
      </main>

      {urgent ? null : <StoryRail stories={STEWARDSHIP_STORIES} />}
    </div>
  );
}
