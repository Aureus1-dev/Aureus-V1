'use client';

import { useEffect } from 'react';
import { useJourney } from '../../../state';
import { pickMostRelevantGoal } from './pick-most-relevant-goal';
import type { GoalDto } from '../../../lib/api/goals';
import type { MilestoneDto } from '../../../lib/api/milestones';
import type { TaskDto } from '../../../lib/api/tasks';

export interface HomeJourneyDetail {
  goal: GoalDto | null;
  milestones: MilestoneDto[];
  tasksByMilestoneId: Record<string, TaskDto[]>;
  isLoadingDetail: boolean;
}

/**
 * Loads full journey detail (milestones + tasks) for exactly one goal —
 * the single most relevant active one — rather than fanning out across
 * every active goal on every Home visit (DOMAIN-003 Risk 1). Other
 * active goals still render via `state.goals` at goal-level summary
 * only, which costs nothing extra since `loadGoals()` already loaded it.
 */
export function useHomeJourneyDetail(): HomeJourneyDetail {
  const { state, loadJourneyDetail } = useJourney();
  const goal = pickMostRelevantGoal(state.goals);

  useEffect(() => {
    if (goal && !state.journeysByGoalId[goal.id]) {
      void loadJourneyDetail(goal.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id]);

  const journey = goal ? state.journeysByGoalId[goal.id] : undefined;
  const milestones = journey ? (state.milestonesByJourneyId[journey.id] ?? []) : [];

  return {
    goal,
    milestones,
    tasksByMilestoneId: state.tasksByMilestoneId,
    isLoadingDetail: state.isLoadingDetail,
  };
}
