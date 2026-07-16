import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { JourneyCard } from './JourneyCard';

const goal = { id: 'goal-1', title: 'Find a job', status: 'ACTIVE' as const, userId: 'member-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };

describe('JourneyCard', () => {
  it('renders the goal title and calls onOpen', async () => {
    const onOpen = jest.fn();
    render(<JourneyCard goal={goal} onOpen={onOpen} />);
    expect(screen.getByText('Find a job')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View progress' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows progress when provided', () => {
    render(<JourneyCard goal={goal} progress={{ completed: 1, total: 4 }} onOpen={jest.fn()} />);
    expect(screen.getByText('1 of 4 complete')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<JourneyCard goal={goal} onOpen={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
