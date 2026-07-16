import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ActiveGoalsList } from './ActiveGoalsList';
import type { GoalDto } from '../../../lib/api/goals';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

function makeGoal(o: Partial<GoalDto>): GoalDto {
  return { id: 'g-1', title: 'Goal', status: 'ACTIVE', userId: 'u-1', createdAt: 'x', updatedAt: 'x', deletedAt: null, ...o };
}

const progress = { totalMilestones: 4, completedMilestones: 2, totalTasks: 8, completedTasks: 4 };

describe('ActiveGoalsList', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists only active goals, attaching progress to the detail goal only', () => {
    const goals = [
      makeGoal({ id: 'g-1', title: 'Find a better job' }),
      makeGoal({ id: 'g-2', title: 'Finish a course' }),
      makeGoal({ id: 'g-3', title: 'Old goal', status: 'COMPLETED' }),
    ];

    render(<ActiveGoalsList goals={goals} detailGoalId="g-1" progress={progress} />);

    expect(screen.getByText('Find a better job')).toBeInTheDocument();
    expect(screen.getByText('Finish a course')).toBeInTheDocument();
    expect(screen.queryByText('Old goal')).not.toBeInTheDocument();
    expect(screen.getByText('2 of 4 complete')).toBeInTheDocument();
  });

  it('renders nothing when there are no active goals', () => {
    const { container } = render(
      <ActiveGoalsList goals={[makeGoal({ status: 'COMPLETED' })]} detailGoalId={null} progress={progress} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    const goals = [makeGoal({ id: 'g-1', title: 'Find a better job' })];
    const { container } = render(<ActiveGoalsList goals={goals} detailGoalId="g-1" progress={progress} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
