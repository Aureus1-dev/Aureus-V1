import { pickMostRelevantGoal } from './pick-most-relevant-goal';
import type { GoalDto } from '../../../lib/api/goals';

function makeGoal(o: Partial<GoalDto>): GoalDto {
  return { id: 'g-1', title: 'Goal', status: 'ACTIVE', userId: 'u-1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null, ...o };
}

describe('pickMostRelevantGoal', () => {
  it('returns null when there are no goals', () => {
    expect(pickMostRelevantGoal([])).toBeNull();
  });

  it('ignores non-active goals', () => {
    const goals = [makeGoal({ id: 'g-1', status: 'COMPLETED' }), makeGoal({ id: 'g-2', status: 'ARCHIVED' })];
    expect(pickMostRelevantGoal(goals)).toBeNull();
  });

  it('picks the most recently updated active goal, avoiding an N+1 fan-out across every goal', () => {
    const goals = [
      makeGoal({ id: 'g-1', updatedAt: '2026-01-01T00:00:00Z' }),
      makeGoal({ id: 'g-2', updatedAt: '2026-01-03T00:00:00Z' }),
      makeGoal({ id: 'g-3', updatedAt: '2026-01-02T00:00:00Z' }),
    ];
    expect(pickMostRelevantGoal(goals)?.id).toBe('g-2');
  });

  it('never picks a paused/completed/archived goal even if it is the most recently updated', () => {
    const goals = [
      makeGoal({ id: 'g-1', status: 'ACTIVE', updatedAt: '2026-01-01T00:00:00Z' }),
      makeGoal({ id: 'g-2', status: 'COMPLETED', updatedAt: '2026-01-05T00:00:00Z' }),
    ];
    expect(pickMostRelevantGoal(goals)?.id).toBe('g-1');
  });
});
