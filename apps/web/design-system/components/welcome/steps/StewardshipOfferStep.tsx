'use client';

import Link from 'next/link';
import { Button } from '../../Button/Button';
import styles from './StewardshipOfferStep.module.css';

export interface StewardshipOfferStepProps {
  /** Whether this session is a Guest Steward session (no email/password) — only a guest is offered account creation. */
  isGuest: boolean;
  onContinue: () => void;
}

/**
 * The Stewardship Offer (Member Arrival — Steward Experience migration).
 * Says plainly what Aureus can do on its own and what genuinely stays the
 * member's own action, before the member decides on the coordinated plan
 * — approval-before-action stays a real, informed choice rather than a
 * blank check. Account creation is offered here, only to a guest, using
 * the same permanent, privacy-respecting framing as `GuestClaimBanner`
 * (preserve progress across sessions and devices — never "unlock
 * features," since a guest already has the full Aureus experience).
 */
export function StewardshipOfferStep({ isGuest, onContinue }: StewardshipOfferStepProps) {
  return (
    <div className={styles.step}>
      <h2 className={styles.title}>What Aureus does, and what stays yours</h2>

      <div className={styles.columns}>
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Aureus can</h3>
          <ul className={styles.list}>
            <li>Search across opportunities, resources, training, and community for what fits</li>
            <li>Prepare a plan and explain why each step was chosen</li>
            <li>Keep track of what you&apos;re working toward, so you never repeat yourself</li>
            <li>Watch for new opportunities that match your goals over time</li>
          </ul>
        </div>
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Only you can</h3>
          <ul className={styles.list}>
            <li>Decide what to approve — nothing happens until you say yes</li>
            <li>Submit an application, sign a document, or attend an appointment</li>
            <li>Talk with a human steward when you want a person, not just a plan</li>
          </ul>
        </div>
      </div>

      {isGuest ? (
        <div className={styles.offer}>
          <p className={styles.offerText}>
            You have the full Aureus experience right now, with no account required. Creating a free account only
            preserves your progress across sessions and devices — without one, this stays only as long as you&apos;re
            actively using it.
          </p>
          <div className={styles.actions}>
            <Link href="/register">
              <Button type="button">Create free account</Button>
            </Link>
            <Button type="button" variant="secondary" onClick={onContinue}>
              Continue without an account
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={onContinue}>Continue</Button>
      )}
    </div>
  );
}
