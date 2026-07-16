import { computeNextStep } from './compute-next-step';
import type { MilestoneDto } from '../../../lib/api/milestones';
import type { TaskDto } from '../../../lib/api/tasks';

const NOW = '2026-01-01T00:00:00Z';

function makeMilestone(o: Partial<MilestoneDto>): MilestoneDto {
  return { id: 'm-1', title: 'Milestone', status: 'PENDING', position: 0, journeyId: 'j-1', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o };
}

function makeTask(o: Partial<TaskDto>): TaskDto {
  return { id: 't-1', title: 'Task', status: 'PENDING', priority: 'MEDIUM', position: 0, milestoneId: 'm-1', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o };
}

describe('computeNextStep', () => {
  it('returns null when there are no milestones', () => {
    expect(computeNextStep([], {})).toBeNull();
  });

  it('picks the first incomplete task of the first incomplete milestone, in position order', () => {
    const milestones = [
      makeMilestone({ id: 'm-2', title: 'Second', position: 1 }),
      makeMilestone({ id: 'm-1', title: 'First', position: 0 }),
    ];
    const tasksByMilestoneId = {
      'm-1': [makeTask({ id: 't-2', title: 'Second task', position: 1, milestoneId: 'm-1' }), makeTask({ id: 't-1', title: 'First task', position: 0, milestoneId: 'm-1' })],
      'm-2': [makeTask({ id: 't-3', title: 'Other milestone task', milestoneId: 'm-2' })],
    };

    expect(computeNextStep(milestones, tasksByMilestoneId)).toEqual({ taskTitle: 'First task', milestoneTitle: 'First' });
  });

  it('skips completed and skipped milestones', () => {
    const milestones = [
      makeMilestone({ id: 'm-1', title: 'Done', status: 'COMPLETED', position: 0 }),
      makeMilestone({ id: 'm-2', title: 'Skipped', status: 'SKIPPED', position: 1 }),
      makeMilestone({ id: 'm-3', title: 'Active', status: 'IN_PROGRESS', position: 2 }),
    ];
    const tasksByMilestoneId = { 'm-3': [makeTask({ id: 't-1', title: 'Do this', milestoneId: 'm-3' })] };

    expect(computeNextStep(milestones, tasksByMilestoneId)).toEqual({ taskTitle: 'Do this', milestoneTitle: 'Active' });
  });

  it('skips completed and skipped tasks within a milestone', () => {
    const milestones = [makeMilestone({ id: 'm-1', title: 'Active' })];
    const tasksByMilestoneId = {
      'm-1': [
        makeTask({ id: 't-1', title: 'Done', status: 'COMPLETED', position: 0 }),
        makeTask({ id: 't-2', title: 'Skipped', status: 'SKIPPED', position: 1 }),
        makeTask({ id: 't-3', title: 'Next', status: 'PENDING', position: 2 }),
      ],
    };

    expect(computeNextStep(milestones, tasksByMilestoneId)).toEqual({ taskTitle: 'Next', milestoneTitle: 'Active' });
  });

  it('falls through to the next milestone when the current one has no incomplete tasks', () => {
    const milestones = [
      makeMilestone({ id: 'm-1', title: 'Empty of open tasks', position: 0 }),
      makeMilestone({ id: 'm-2', title: 'Has open tasks', position: 1 }),
    ];
    const tasksByMilestoneId = {
      'm-1': [makeTask({ id: 't-1', title: 'Done already', status: 'COMPLETED', milestoneId: 'm-1' })],
      'm-2': [makeTask({ id: 't-2', title: 'Open task', milestoneId: 'm-2' })],
    };

    expect(computeNextStep(milestones, tasksByMilestoneId)).toEqual({ taskTitle: 'Open task', milestoneTitle: 'Has open tasks' });
  });

  it('returns null when every milestone and task is complete', () => {
    const milestones = [makeMilestone({ id: 'm-1', title: 'Done', status: 'COMPLETED' })];
    expect(computeNextStep(milestones, { 'm-1': [makeTask({ status: 'COMPLETED' })] })).toBeNull();
  });
});
