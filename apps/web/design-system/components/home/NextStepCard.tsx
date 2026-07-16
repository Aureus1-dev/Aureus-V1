import Link from 'next/link';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { useRegisterHighlightTarget } from '../../../state';
import type { NextStep } from './compute-next-step';
import styles from './NextStepCard.module.css';
import highlightStyles from '../highlight/highlight.module.css';

export interface NextStepCardProps {
  nextStep: NextStep | null;
  hasGoal: boolean;
}

/**
 * Today's Next Step (AFX-001 §6 "One Meaningful Next Step") — the
 * single most prominent widget on Home, since it is the direct answer
 * to "what should I do now." Registered as `Home.NextMission` in the
 * Global Highlight Registry (DOMAIN-005 Founder Decision 4) so the
 * voice steward can draw attention to it while talking.
 */
export function NextStepCard({ nextStep, hasGoal }: NextStepCardProps) {
  const { ref, isActive } = useRegisterHighlightTarget<HTMLDivElement>('Home.NextMission', {
    label: 'Today’s next step',
    description: nextStep?.taskTitle,
  });

  return (
    <div ref={ref} className={isActive ? highlightStyles.highlighted : undefined}>
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
    </div>
  );
}
