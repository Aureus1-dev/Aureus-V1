import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { NextStepCard } from './NextStepCard';

describe('NextStepCard', () => {
  it('shows the next task and its parent milestone when one exists', () => {
    render(
      <NextStepCard
        nextStep={{ taskTitle: 'Update your resume', milestoneTitle: 'Prepare to apply' }}
        hasGoal
      />,
    );

    expect(screen.getByText('Update your resume')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === 'Part of “Prepare to apply”')).toBeInTheDocument();
  });

  it('shows encouraging fallback copy for a member with a goal but no computed next step', () => {
    render(<NextStepCard nextStep={null} hasGoal />);
    expect(screen.getByText('Your next step is ready whenever you are.')).toBeInTheDocument();
  });

  it('shows onboarding copy for a member with no goal yet', () => {
    render(<NextStepCard nextStep={null} hasGoal={false} />);
    expect(screen.getByText('Start your first mission to see your next step here.')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <NextStepCard nextStep={{ taskTitle: 'Update your resume', milestoneTitle: 'Prepare to apply' }} hasGoal />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
