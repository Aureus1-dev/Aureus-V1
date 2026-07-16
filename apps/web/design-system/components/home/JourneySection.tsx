'use client';

import { useJourney } from '../../../state';
import { useHomeJourneyDetail } from './useHomeJourneyDetail';
import { computeNextStep } from './compute-next-step';
import { computeProgressOverview } from './compute-progress-overview';
import { NextStepCard } from './NextStepCard';
import { ProgressOverviewCard } from './ProgressOverviewCard';
import { ActiveGoalsList } from './ActiveGoalsList';
import styles from './JourneySection.module.css';

/**
 * Composes Today's Next Step, Progress Overview, and Active Goals from
 * a single `useHomeJourneyDetail()` call — three widgets, one load
 * (FPB-010 §7 "minimal duplication").
 */
export function JourneySection() {
  const { state: journeyState } = useJourney();
  const { goal, milestones, tasksByMilestoneId } = useHomeJourneyDetail();

  const nextStep = computeNextStep(milestones, tasksByMilestoneId);
  const overview = computeProgressOverview(milestones, tasksByMilestoneId);

  return (
    <div className={styles.section}>
      <NextStepCard nextStep={nextStep} hasGoal={goal !== null} />
      <ProgressOverviewCard overview={overview} goalTitle={goal?.title ?? null} />
      <ActiveGoalsList goals={journeyState.goals} detailGoalId={goal?.id ?? null} progress={overview} />
    </div>
  );
}
