import type { ReactNode } from 'react';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Feedback primitive (FPB-005 §3, FPB-014 §4). Communicates failure in
 * calm, respectful language rather than raw technical error text, per
 * the Error & Recovery Specification.
 */
export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <div className={styles.errorState} role="alert">
      <p className={styles.title}>{title}</p>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
