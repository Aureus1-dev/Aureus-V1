import type { MilestoneDto } from '../../../lib/api/milestones';
import type { TaskDto } from '../../../lib/api/tasks';

export interface ProgressOverview {
  totalMilestones: number;
  completedMilestones: number;
  totalTasks: number;
  completedTasks: number;
}

/**
 * Aggregates whatever milestone/task detail is currently loaded (by
 * design, only the member's single most-relevant goal — see
 * `useHomeJourneyDetail` — not a fan-out across every goal, per
 * DOMAIN-003 Risk 1). This communicates completion on the member's
 * current focus, never a performance score (AFX-005 §3, §6).
 */
export function computeProgressOverview(
  milestones: MilestoneDto[],
  tasksByMilestoneId: Record<string, TaskDto[]>,
): ProgressOverview {
  const tasks = Object.values(tasksByMilestoneId).flat();

  return {
    totalMilestones: milestones.length,
    completedMilestones: milestones.filter((m) => m.status === 'COMPLETED').length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
  };
}
