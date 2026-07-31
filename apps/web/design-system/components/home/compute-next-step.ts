import type { MilestoneDto } from '../../../lib/api/milestones';
import type { TaskDto } from '../../../lib/api/tasks';

export interface NextStep {
  taskTitle: string;
  milestoneTitle: string;
}

/**
 * The single next actionable task across a Journey's milestones, in
 * milestone-position then task-position order (AFX-001 §6 "One
 * Meaningful Next Step"). Completed and skipped items are never
 * surfaced as "next" — this mirrors the computation already used once
 * in `FirstRunWelcome`'s `NextStepSummary`, generalized here for a
 * journey that may have many milestones/tasks rather than the single
 * starter pair First Mission creates.
 */
export function computeNextStep(
  milestones: MilestoneDto[],
  tasksByMilestoneId: Record<string, TaskDto[]>,
): NextStep | null {
  const orderedMilestones = [...milestones]
    .filter((m) => m.status !== 'COMPLETED' && m.status !== 'SKIPPED')
    .sort((a, b) => a.position - b.position);

  for (const milestone of orderedMilestones) {
    const nextTask = [...(tasksByMilestoneId[milestone.id] ?? [])]
      .filter((t) => t.status !== 'COMPLETED' && t.status !== 'SKIPPED')
      .sort((a, b) => a.position - b.position)[0];

    if (nextTask) {
      return { taskTitle: nextTask.title, milestoneTitle: milestone.title };
    }
  }

  return null;
}
