import styles from './UrgentSafetyNotice.module.css';

/**
 * Contextual safety disclosure (addendum §4.2–§4.3). Shown only near the
 * active help surface when an urgent-help route or signal is present —
 * never as a universal first-message banner (addendum §1, explicitly
 * rejecting that as making "ordinary Aureus interactions feel like
 * crisis-chat onboarding"). Wording is the addendum's own generic
 * example; no jurisdiction-specific resource is hard-coded here.
 */
export function UrgentSafetyNotice() {
  return (
    <p className={styles.notice} role="note">
      Aureus is an AI steward, not emergency services. If someone is in immediate danger, contact
      local emergency services now.
    </p>
  );
}
