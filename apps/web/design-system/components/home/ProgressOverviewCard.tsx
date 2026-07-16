import { Card } from '../Card/Card';
import { ProgressIndicator } from '../journey/ProgressIndicator';
import type { ProgressOverview } from './compute-progress-overview';
import styles from './ProgressOverviewCard.module.css';

export interface ProgressOverviewCardProps {
  overview: ProgressOverview;
  goalTitle: string | null;
}

/**
 * Progress overview, scoped honestly to the member's current focus
 * (the one goal Home loads detail for) — not a member-wide aggregate,
 * and never framed as a score (AFX-005 §3, §6).
 */
export function ProgressOverviewCard({ overview, goalTitle }: ProgressOverviewCardProps) {
  if (!goalTitle) {
    return null;
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.eyebrow}>Progress on &ldquo;{goalTitle}&rdquo;</h2>
      <ProgressIndicator
        completed={overview.completedMilestones}
        total={overview.totalMilestones}
        label={`${overview.completedMilestones} of ${overview.totalMilestones} milestones complete`}
      />
      <p className={styles.taskCount}>
        {overview.completedTasks} of {overview.totalTasks} tasks complete
      </p>
    </Card>
  );
}
