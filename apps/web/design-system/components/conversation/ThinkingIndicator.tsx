import styles from './ThinkingIndicator.module.css';

export function ThinkingIndicator() {
  return (
    <div
      className={styles.wrapper}
      role="status"
      aria-live="polite"
      aria-label="Aureus is working on your request"
    >
      <span className={styles.signal} aria-hidden="true" />
      <span className={styles.copy}>
        <strong>Working on that…</strong>
        <span>I’ll bring the useful result into the Hall when it’s ready.</span>
      </span>
    </div>
  );
}
