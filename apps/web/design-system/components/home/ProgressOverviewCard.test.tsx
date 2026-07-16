import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ProgressOverviewCard } from './ProgressOverviewCard';

const overview = { totalMilestones: 4, completedMilestones: 1, totalTasks: 10, completedTasks: 3 };

describe('ProgressOverviewCard', () => {
  it('renders progress scoped to the named goal, never as a bare score', () => {
    render(<ProgressOverviewCard overview={overview} goalTitle="Find a better job" />);

    expect(
      screen.getByText((_, element) => element?.textContent === 'Progress on “Find a better job”'),
    ).toBeInTheDocument();
    expect(screen.getByText('1 of 4 milestones complete')).toBeInTheDocument();
    expect(screen.getByText('3 of 10 tasks complete')).toBeInTheDocument();
  });

  it('renders nothing when there is no current-focus goal to show progress for', () => {
    const { container } = render(<ProgressOverviewCard overview={overview} goalTitle={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ProgressOverviewCard overview={overview} goalTitle="Find a better job" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
