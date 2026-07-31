import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { GoalReflectionStep } from './GoalReflectionStep';

const reflection = 'It sounds like finding stable housing before Friday is what would help most right now.';

describe('GoalReflectionStep', () => {
  it('reflects the understood outcome without asking a question', () => {
    render(<GoalReflectionStep reflection={reflection} onConfirm={jest.fn()} onAdjust={jest.fn()} />);
    expect(screen.getByText(reflection)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'What would help most right now?' })).not.toBeInTheDocument();
  });

  it('confirms the reflected outcome', async () => {
    const onConfirm = jest.fn();
    render(<GoalReflectionStep reflection={reflection} onConfirm={onConfirm} onAdjust={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: "That's right — continue" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('lets the member correct a wrong inference instead of confirming it', async () => {
    const onAdjust = jest.fn();
    render(<GoalReflectionStep reflection={reflection} onConfirm={jest.fn()} onAdjust={onAdjust} />);

    await userEvent.click(screen.getByRole('button', { name: 'Not quite' }));
    const input = screen.getByLabelText('What would help most', { exact: false });
    await userEvent.type(input, '  Actually I need legal help fighting the eviction  ');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onAdjust).toHaveBeenCalledWith('Actually I need legal help fighting the eviction');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<GoalReflectionStep reflection={reflection} onConfirm={jest.fn()} onAdjust={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
