import type { GoalDto } from '../../../lib/api/goals';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { ProgressIndicator } from './ProgressIndicator';
import styles from './JourneyCard.module.css';

export interface JourneyCardProps {
  goal: GoalDto;
  progress?: { completed: number; total: number };
  onOpen: () => void;
}

/**
 * Journey Card (FPB-005 §3 "Information"). One Goal → Journey thread,
 * summarized for the standing Journey surface and the Welcome flow.
 */
export function JourneyCard({ goal, progress, onOpen }: JourneyCardProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{goal.title}</h3>
        <span className={styles.status}>{goal.status.toLowerCase()}</span>
      </div>
      {progress ? <ProgressIndicator completed={progress.completed} total={progress.total} /> : null}
      <Button variant="secondary" onClick={onOpen}>
        View progress
      </Button>
    </Card>
  );
}
