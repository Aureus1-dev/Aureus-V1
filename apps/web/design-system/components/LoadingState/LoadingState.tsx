import styles from './LoadingState.module.css';

export interface LoadingStateProps {
  label?: string;
}

/**
 * Feedback primitive (FPB-005 §3 "Feedback"). Announces progress to
 * assistive technology via aria-live rather than relying on motion alone
 * (FPB-011 §4, §8).
 */
export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <div className={styles.loadingState} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
