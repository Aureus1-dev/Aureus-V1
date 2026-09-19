'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSession } from '../../../state';
import { FormField } from '../FormField/FormField';
import type { CarryReason, ClaimStatus } from './engine/types';
import styles from './CarryBoundaryPanel.module.css';

export interface CarryBoundaryPanelProps {
  reason: CarryReason;
  carryingSummary: string[];
  claimStatus: ClaimStatus;
  claimErrorMessage: string | null;
  onDecline: () => void;
  onClaimStart: () => void;
  onClaimSuccess: () => void;
  onClaimError: (message: string) => void;
}

/**
 * The Carry Boundary account/claim panel (portfolio §6 State D, §15,
 * §20; addendum §5). Explains what Aureus is carrying, why continuity
 * requires an account, and what will be preserved — then offers a real
 * account claim or a genuine, prominent "Not now".
 *
 * `claimAccount` below is a REAL call into the app's existing guest/claim
 * infrastructure (`state/session/SessionContext.tsx`) — it really
 * upgrades the current guest session in place. That is deliberate: the
 * Carry Boundary is the one place in this prototype where "account
 * creation" is not a fixture, because the underlying capability already
 * exists in the real app and faking it here would be exactly the kind of
 * simulated capability the design doctrine forbids.
 */
export function CarryBoundaryPanel({
  reason,
  carryingSummary,
  claimStatus,
  claimErrorMessage,
  onDecline,
  onClaimStart,
  onClaimSuccess,
  onClaimError,
}: CarryBoundaryPanelProps) {
  const { claimAccount } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.includes('@')) {
      setFieldError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setFieldError('Password must be at least 8 characters.');
      return;
    }
    setFieldError(null);
    onClaimStart();
    try {
      await claimAccount(email, password);
      onClaimSuccess();
    } catch {
      onClaimError(
        "We couldn't create your account just now. Your work is safe here — you can try again.",
      );
    }
  }

  if (claimStatus === 'success') {
    return (
      <div className={styles.overlay} role="presentation">
        <div className={styles.panel} role="status">
          <p className={styles.successMessage}>
            You&apos;re set. Aureus will keep carrying this — across time and devices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="false"
        aria-labelledby="carry-boundary-heading"
      >
        <h2 id="carry-boundary-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
          I can carry this with you.
        </h2>
        <p className={styles.why}>{reason.why}</p>

        {carryingSummary.length > 0 ? (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>What Aureus is carrying</p>
            <ul className={styles.list}>
              {carryingSummary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.section}>
          <p className={styles.sectionLabel}>What will be preserved</p>
          <ul className={styles.list}>
            <li>This conversation and what Aureus has found so far</li>
            <li>Any documents you&apos;ve shared</li>
            <li>Deadlines and reminders Aureus is tracking</li>
          </ul>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionLabel}>Permission requested</p>
          <p className={styles.permissionText}>
            Just an email and password, so this stays only yours. Nothing else is requested.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <FormField
            id="carry-boundary-email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
            disabled={claimStatus === 'pending'}
          />
          <FormField
            id="carry-boundary-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            required
            helpText="At least 8 characters."
            error={fieldError ?? undefined}
            disabled={claimStatus === 'pending'}
          />

          {claimStatus === 'error' && claimErrorMessage ? (
            <p className={styles.claimError} role="alert">
              {claimErrorMessage}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={claimStatus === 'pending'}>
              {claimStatus === 'pending'
                ? 'Creating your account…'
                : 'Create your free Aureus account'}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={onDecline}
              disabled={claimStatus === 'pending'}
            >
              Not now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
