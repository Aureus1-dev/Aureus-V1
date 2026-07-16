import { computeProgressOverview } from './compute-progress-overview';
import type { MilestoneDto } from '../../../lib/api/milestones';
import type { TaskDto } from '../../../lib/api/tasks';

const NOW = '2026-01-01T00:00:00Z';

function makeMilestone(o: Partial<MilestoneDto>): MilestoneDto {
  return { id: 'm-1', title: 'Milestone', status: 'PENDING', position: 0, journeyId: 'j-1', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o };
}

function makeTask(o: Partial<TaskDto>): TaskDto {
  return { id: 't-1', title: 'Task', status: 'PENDING', priority: 'MEDIUM', position: 0, milestoneId: 'm-1', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o };
}

describe('computeProgressOverview', () => {
  it('counts zero of zero when nothing is loaded', () => {
    expect(computeProgressOverview([], {})).toEqual({ totalMilestones: 0, completedMilestones: 0, totalTasks: 0, completedTasks: 0 });
  });

  it('counts completed milestones and tasks across every loaded milestone', () => {
    const milestones = [
      makeMilestone({ id: 'm-1', status: 'COMPLETED' }),
      makeMilestone({ id: 'm-2', status: 'IN_PROGRESS' }),
    ];
    const tasksByMilestoneId = {
      'm-1': [makeTask({ id: 't-1', status: 'COMPLETED', milestoneId: 'm-1' })],
      'm-2': [
        makeTask({ id: 't-2', status: 'COMPLETED', milestoneId: 'm-2' }),
        makeTask({ id: 't-3', status: 'PENDING', milestoneId: 'm-2' }),
      ],
    };

    expect(computeProgressOverview(milestones, tasksByMilestoneId)).toEqual({
      totalMilestones: 2, completedMilestones: 1, totalTasks: 3, completedTasks: 2,
    });
  });
});
