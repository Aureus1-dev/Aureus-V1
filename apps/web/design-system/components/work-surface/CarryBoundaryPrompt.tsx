'use client';

import { useEffect, useRef } from 'react';
import styles from './CarryBoundaryPrompt.module.css';

export interface CarryBoundaryPromptProps {
  onYes: () => void;
  onNo: () => void;
  declined: boolean;
}

/**
 * Carry Boundary uncertain-detection question (addendum §5.4): before
 * jumping to registration, Aureus asks a plain-language intent question.
 * Rendered as a small anchored panel, not a full-screen modal — the work
 * behind it stays visible, per portfolio §6 State D ("The work remains
 * visually behind/around the prompt so the person understands nothing is
 * lost").
 */
export function CarryBoundaryPrompt({ onYes, onNo, declined }: CarryBoundaryPromptProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!declined) panelRef.current?.focus();
  }, [declined]);

  return (
    <div
      ref={panelRef}
      className={styles.panel}
      role="region"
      aria-labelledby="carry-boundary-question"
      tabIndex={-1}
    >
      {declined ? (
        <p className={styles.declinedMessage} role="status">
          No problem — continuing right where you were.
        </p>
      ) : (
        <>
          <p id="carry-boundary-question" className={styles.question}>
            Do you want Aureus to carry this beyond this visit?
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.yes} onClick={onYes}>
              Yes, keep carrying this
            </button>
            <button type="button" className={styles.no} onClick={onNo}>
              Not now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
