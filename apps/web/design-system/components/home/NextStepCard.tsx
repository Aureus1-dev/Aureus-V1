import Link from 'next/link';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import type { NextStep } from './compute-next-step';
import styles from './NextStepCard.module.css';

export interface NextStepCardProps {
  nextStep: NextStep | null;
  hasGoal: boolean;
}

/**
 * Today's Next Step (AFX-001 §6 "One Meaningful Next Step") — the
 * single most prominent widget on Home, since it is the direct answer
 * to "what should I do now."
 */
export function NextStepCard({ nextStep, hasGoal }: NextStepCardProps) {
  return (
    <Card className={styles.card}>
      <h2 className={styles.eyebrow}>Today&apos;s next step</h2>
      {nextStep ? (
        <>
          <p className={styles.title}>{nextStep.taskTitle}</p>
          <p className={styles.context}>Part of &ldquo;{nextStep.milestoneTitle}&rdquo;</p>
        </>
      ) : (
        <p className={styles.title}>
          {hasGoal ? 'Your next step is ready whenever you are.' : 'Start your first mission to see your next step here.'}
        </p>
      )}
      <Link href="/journey">
        <Button>View my journey</Button>
      </Link>
    </Card>
  );
}
