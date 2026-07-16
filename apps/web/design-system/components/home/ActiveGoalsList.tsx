'use client';

import { useRouter } from 'next/navigation';
import type { GoalDto } from '../../../lib/api/goals';
import { JourneyCard } from '../journey/JourneyCard';
import type { ProgressOverview } from './compute-progress-overview';
import styles from './ActiveGoalsList.module.css';

export interface ActiveGoalsListProps {
  goals: GoalDto[];
  detailGoalId: string | null;
  progress: ProgressOverview;
}

/**
 * Every active goal, goal-level only (title, status) — the data
 * `loadGoals()` already provides, no extra request. Only the single
 * goal Home has full detail for (see `useHomeJourneyDetail`) shows a
 * progress bar; the rest are still genuinely useful to see listed.
 */
export function ActiveGoalsList({ goals, detailGoalId, progress }: ActiveGoalsListProps) {
  const router = useRouter();
  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');

  if (activeGoals.length === 0) {
    return null;
  }

  return (
    <div className={styles.list}>
      <h2 className={styles.title}>Active goals</h2>
      <div className={styles.cards}>
        {activeGoals.map((goal) => (
          <JourneyCard
            key={goal.id}
            goal={goal}
            progress={
              goal.id === detailGoalId
                ? { completed: progress.completedMilestones, total: progress.totalMilestones }
                : undefined
            }
            onOpen={() => router.push('/journey')}
          />
        ))}
      </div>
    </div>
  );
}
