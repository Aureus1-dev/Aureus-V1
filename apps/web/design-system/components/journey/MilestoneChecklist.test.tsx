import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { MilestoneChecklist } from './MilestoneChecklist';

const milestones = [
  { id: 'm1', title: 'Get started', status: 'PENDING' as const, position: 0, journeyId: 'j1', createdAt: 'x', updatedAt: 'x', deletedAt: null },
];
const tasksByMilestoneId = {
  m1: [{ id: 't1', title: 'Take the first step', status: 'PENDING' as const, priority: 'MEDIUM' as const, position: 0, milestoneId: 'm1', createdAt: 'x', updatedAt: 'x', deletedAt: null }],
};

describe('MilestoneChecklist', () => {
  it('toggles a milestone and a task', async () => {
    const onToggleMilestone = jest.fn();
    const onToggleTask = jest.fn();
    render(
      <MilestoneChecklist
        milestones={milestones}
        tasksByMilestoneId={tasksByMilestoneId}
        onToggleMilestone={onToggleMilestone}
        onToggleTask={onToggleTask}
      />,
    );

    await userEvent.click(screen.getByLabelText('Mark milestone "Get started" as complete'));
    expect(onToggleMilestone).toHaveBeenCalledWith('m1', true);

    await userEvent.click(screen.getByLabelText('Mark "Take the first step" as complete'));
    expect(onToggleTask).toHaveBeenCalledWith('m1', 't1', true);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <MilestoneChecklist
        milestones={milestones}
        tasksByMilestoneId={tasksByMilestoneId}
        onToggleMilestone={jest.fn()}
        onToggleTask={jest.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
