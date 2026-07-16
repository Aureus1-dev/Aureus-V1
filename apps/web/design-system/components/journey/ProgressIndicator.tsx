import styles from './ProgressIndicator.module.css';

export interface ProgressIndicatorProps {
  completed: number;
  total: number;
  label?: string;
}

/**
 * Progress Indicator (FPB-005 §3 "Data Presentation"). Progress is
 * recorded, not scored — this communicates completion, never a
 * performance metric (AFX-005 §3, §6).
 */
export function ProgressIndicator({ completed, total, label }: ProgressIndicatorProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const accessibleLabel = label ?? `${completed} of ${total} complete`;

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={accessibleLabel}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
      <span className={styles.text}>{accessibleLabel}</span>
    </div>
  );
}
