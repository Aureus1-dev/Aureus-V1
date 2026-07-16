'use client';

import { useRouter } from 'next/navigation';
import type { GoalDto } from '../../../lib/api/goals';
import { JourneyCard } from '../journey/JourneyCard';
import { useRegisterHighlightTarget } from '../../../state';
import type { ProgressOverview } from './compute-progress-overview';
import styles from './ActiveGoalsList.module.css';
import highlightStyles from '../highlight/highlight.module.css';

export interface ActiveGoalsListProps {
  goals: GoalDto[];
  detailGoalId: string | null;
  progress: ProgressOverview;
}

/**
 * The single active goal Home has full detail for (see
 * `useHomeJourneyDetail`), split into its own component only so it can
 * carry a highlight registration — `useRegisterHighlightTarget` must be
 * called from a component rendered once per goal, not from inside the
 * list's own `.map()` (Rules of Hooks). Registered as
 * `Journey.Goal.Primary` (DOMAIN-005 Founder Decision 4) rather than a
 * per-goal id, since it is the member's single current focus, not one
 * of several equally-addressable items.
 */
function PrimaryActiveGoalCard({
  goal,
  progress,
  onOpen,
}: {
  goal: GoalDto;
  progress: { completed: number; total: number };
  onOpen: () => void;
}) {
  const { ref, isActive } = useRegisterHighlightTarget<HTMLDivElement>('Journey.Goal.Primary', { label: goal.title });
  return (
    <div ref={ref} className={isActive ? highlightStyles.highlighted : undefined}>
      <JourneyCard goal={goal} progress={progress} onOpen={onOpen} />
    </div>
  );
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
        {activeGoals.map((goal) =>
          goal.id === detailGoalId ? (
            <PrimaryActiveGoalCard
              key={goal.id}
              goal={goal}
              progress={{ completed: progress.completedMilestones, total: progress.totalMilestones }}
              onOpen={() => router.push('/journey')}
            />
          ) : (
            <JourneyCard key={goal.id} goal={goal} onOpen={() => router.push('/journey')} />
          ),
        )}
      </div>
    </div>
  );
}
