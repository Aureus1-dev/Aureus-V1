import styles from './ThinkingIndicator.module.css';

/**
 * Visible listening/thinking state (FPB-005 §3, AFX-002 §4 "Silence").
 * Announces presence without theatrical simulation — a calm status, not
 * an animated performance of "typing".
 */
export function ThinkingIndicator() {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite" aria-label="Your steward is thinking">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.dot} aria-hidden="true" />
      <span aria-hidden="true">Your steward is thinking</span>
    </div>
  );
}
