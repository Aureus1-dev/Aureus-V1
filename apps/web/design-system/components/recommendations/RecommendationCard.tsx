import type { ReactNode } from 'react';
import { ApprovalPanel } from './ApprovalPanel';
import styles from './RecommendationCard.module.css';

export interface RecommendationSubject {
  title: string;
  description?: string;
}

export interface RecommendationCardProps {
  rationale: string;
  subject: RecommendationSubject | null;
  onApprove: () => void;
  onDismiss: () => void;
  deciding: boolean;
  action?: ReactNode;
}

/**
 * Recommendation Card (FPB-005 §3 "Information") — pairs an
 * ApprovalPanel with whatever the recommendation points to (an
 * Opportunity today; Resource/Course/Pod in future Domains, per the
 * backend's `RecommendationCategory`).
 */
export function RecommendationCard({ rationale, subject, onApprove, onDismiss, deciding, action }: RecommendationCardProps) {
  return (
    <ApprovalPanel rationale={rationale} onApprove={onApprove} onDismiss={onDismiss} deciding={deciding}>
      {subject ? (
        <div className={styles.subject}>
          <p className={styles.subjectTitle}>{subject.title}</p>
          {subject.description ? <p className={styles.subjectDescription}>{subject.description}</p> : null}
          {action}
        </div>
      ) : null}
    </ApprovalPanel>
  );
}
