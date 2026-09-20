'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
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
 * §20; addendum §5). Slice 0 is a fixture-only review surface, so this
 * panel demonstrates the proposed interaction without creating a real
 * account or claiming that fixture state has become durable.
 */
export function CarryBoundaryPanel({
  reason,
  carryingSummary,
  claimStatus,
  claimErrorMessage,
  onDecline,
  onClaimStart,
  onClaimSuccess,
  onClaimError: _onClaimError,
}: CarryBoundaryPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent) {
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
    // Slice 0 deliberately does not call the real guest/account APIs. This
    // success state previews the intended UI only; no entered data is sent.
    onClaimSuccess();
  }

  if (claimStatus === 'success') {
    return (
      <div className={styles.overlay} role="presentation">
        <div className={styles.panel} role="status">
          <p className={styles.successMessage}>
            Prototype complete. In production, this is where Aureus would confirm continuity. No
            account was created here.
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
            <p className={styles.sectionLabel}>What Aureus is carrying in this prototype</p>
            <ul className={styles.list}>
              {carryingSummary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.section}>
          <p className={styles.sectionLabel}>What production would preserve at this boundary</p>
          <ul className={styles.list}>
            <li>This conversation and the work Aureus has completed so far</li>
            <li>Documents the member chose to keep with the matter</li>
            <li>Approved deadlines, reminders, and follow-through state</li>
          </ul>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionLabel}>Prototype review only</p>
          <p className={styles.permissionText}>
            No account will be created and nothing entered in this form is sent or saved. The form
            exists only to review the proposed Carry Boundary interaction.
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
            helpText="At least 8 characters. Prototype only — not sent or saved."
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
              {claimStatus === 'pending' ? 'Previewing…' : 'Preview account claim'}
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
