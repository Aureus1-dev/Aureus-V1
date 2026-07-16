import type { GoalDto } from '../../../lib/api/goals';

/**
 * The one goal Home loads full journey detail for for Today's Next
 * Step / Progress Overview (DOMAIN-003 Risk 1) — the most recently
 * updated active goal, avoiding an N+1 fan-out across every goal on
 * every Home visit. Other active goals still render at goal-level
 * summary only (title, status), which `listGoals` already provides.
 */
export function pickMostRelevantGoal(goals: GoalDto[]): GoalDto | null {
  const active = goals.filter((g) => g.status === 'ACTIVE');
  if (active.length === 0) return null;

  return [...active].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}
