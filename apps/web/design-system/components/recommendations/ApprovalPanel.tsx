import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import styles from './ApprovalPanel.module.css';

export interface ApprovalPanelProps {
  rationale: string;
  onApprove: () => void;
  onDismiss: () => void;
  deciding: boolean;
  children?: ReactNode;
}

/**
 * Approval Panel (FPB-005 §3 "Forms") — the concrete realization of
 * "Aureus prepares. The member approves." (AFX-001 §10). Every
 * recommendation explains why it was made and leaves the decision
 * entirely with the member (AFX-006 §6 Participatory Stewardship).
 */
export function ApprovalPanel({ rationale, onApprove, onDismiss, deciding, children }: ApprovalPanelProps) {
  return (
    <div className={styles.panel}>
      <p className={styles.rationale}>{rationale}</p>
      {children}
      <div className={styles.actions}>
        <Button onClick={onApprove} disabled={deciding}>
          {deciding ? 'Saving…' : 'Approve'}
        </Button>
        <Button variant="secondary" onClick={onDismiss} disabled={deciding}>
          Not now
        </Button>
      </div>
    </div>
  );
}
