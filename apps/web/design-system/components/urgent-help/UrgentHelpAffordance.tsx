'use client';

import { useEffect, useRef, useState } from 'react';
import { VisuallyHidden } from '../../accessibility';
import styles from './UrgentHelpAffordance.module.css';

const DIALOG_TITLE_ID = 'urgent-help-title';

/**
 * B2 (Gate B — The Gate): the persistent Urgent-help affordance LAUNCH-001
 * names as part of arrival. Mounted once in the member layout so it is
 * present on every member surface without per-page wiring — the same
 * pattern `StewardWorkspace` (fixed bottom-right) and `GlobalActionPalette`
 * (fixed top-right) already use for persistent chrome. This is fixed
 * bottom-left, the one corner neither of those occupies, so all three
 * coexist without visual collision; it is not "a second competing floating
 * widget" in the sense that note warns against (two conversational/voice
 * presences) — this is a safety affordance, not a conversation surface.
 *
 * Scope boundary: this affordance only needs to be reachable and honest.
 * It does not perform crisis-language detection, urgency assessment, or
 * resource discovery/matching against the City Sheet — those are Gate C's
 * C1/C3/C4 and are not yet built. Its content is static, universally true
 * regardless of Aureus's own verification status (A4), and names that
 * status honestly rather than implying a capability Aureus doesn't have
 * yet (no live steward paging — that's Gate C's C6, also not yet built).
 */
export function UrgentHelpAffordance() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
      >
        Urgent help
      </button>

      {isOpen ? (
        <div className={styles.backdrop} onClick={close}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={DIALOG_TITLE_ID}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={DIALOG_TITLE_ID} className={styles.title}>
              Urgent help
            </h2>
            <p>If you or someone else is in immediate danger, call 911 now.</p>
            <p>
              <strong>988 Suicide &amp; Crisis Lifeline</strong> — call or text 988. Available
              24 hours a day, 7 days a week.
            </p>
            <p>
              <strong>Crisis Text Line</strong> — text HOME to 741741.
            </p>
            <p className={styles.honestNote}>
              Aureus&apos;s own local resource guide for Chester and Delaware County is still
              being verified and isn&apos;t ready to rely on yet. The numbers above are always
              real and available right now.
            </p>
            <button type="button" className={styles.closeButton} onClick={close}>
              Close
              <VisuallyHidden> urgent help</VisuallyHidden>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
