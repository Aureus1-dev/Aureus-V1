import styles from './GuestContinuityWarning.module.css';

export interface GuestContinuityWarningProps {
  onKeepIt: () => void;
  onDismiss: () => void;
}

/**
 * False-negative recovery (portfolio §10; addendum §5.7). A truthful
 * continuity notice, not a registration advertisement — shown once, only
 * when there is meaningful guest work that would otherwise be lost, and
 * never repeated once dismissed or accepted this session.
 */
export function GuestContinuityWarning({ onKeepIt, onDismiss }: GuestContinuityWarningProps) {
  return (
    <div className={styles.banner} role="status">
      <p className={styles.message}>
        This work is only available in this guest visit unless you choose to keep it. Would you like
        Aureus to carry it forward?
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.keep} onClick={onKeepIt}>
          Keep this
        </button>
        <button type="button" className={styles.dismiss} onClick={onDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
