import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { WorkSurfaceView } from './WorkSurfaceView';
import { HOUSING_MATTER } from './engine/fixtures';

function matterAt(stepIndex: number, needsYouResolved = false) {
  return { script: HOUSING_MATTER, stepIndex, needsYouResolved };
}

describe('WorkSurfaceView', () => {
  it('shows the working-on outcome and the current action-level status line, not a percentage', () => {
    render(
      <WorkSurfaceView matter={matterAt(0)} onAsk={jest.fn()} onResolveNeedsYou={jest.fn()} />,
    );

    expect(screen.getByRole('heading', { name: HOUSING_MATTER.workingOn })).toBeInTheDocument();
    expect(screen.getByText(HOUSING_MATTER.steps[0]!.label)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('lists what Aureus is carrying', () => {
    render(
      <WorkSurfaceView matter={matterAt(1)} onAsk={jest.fn()} onResolveNeedsYou={jest.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'Aureus is carrying' })).toBeInTheDocument();
    for (const item of HOUSING_MATTER.carrying) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it('reveals Needs You only once the matter has reached that point, and lets the member resolve it', async () => {
    const onResolveNeedsYou = jest.fn();
    const { rerender } = render(
      <WorkSurfaceView
        matter={matterAt(0)}
        onAsk={jest.fn()}
        onResolveNeedsYou={onResolveNeedsYou}
      />,
    );
    expect(screen.queryByRole('heading', { name: 'Needs you' })).not.toBeInTheDocument();

    rerender(
      <WorkSurfaceView
        matter={matterAt(HOUSING_MATTER.needsYouAt)}
        onAsk={jest.fn()}
        onResolveNeedsYou={onResolveNeedsYou}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Needs you' })).toBeInTheDocument();
    expect(screen.getByText(HOUSING_MATTER.needsYou!.prompt)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: HOUSING_MATTER.needsYou!.actionLabel }),
    );
    expect(onResolveNeedsYou).toHaveBeenCalledTimes(1);
  });

  it('hides Needs You once it has been resolved', () => {
    render(
      <WorkSurfaceView
        matter={matterAt(HOUSING_MATTER.needsYouAt, true)}
        onAsk={jest.fn()}
        onResolveNeedsYou={jest.fn()}
      />,
    );
    expect(screen.queryByRole('heading', { name: 'Needs you' })).not.toBeInTheDocument();
  });

  it('shows the durable result artifact once the matter reaches it, and states what done means', () => {
    render(
      <WorkSurfaceView
        matter={matterAt(HOUSING_MATTER.artifactAt)}
        onAsk={jest.fn()}
        onResolveNeedsYou={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'View result' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Done means' })).toBeInTheDocument();
    expect(screen.getByText(HOUSING_MATTER.doneMeans)).toBeInTheDocument();
  });

  it('keeps the composer available so a member can ask about the work in progress', () => {
    render(
      <WorkSurfaceView matter={matterAt(1)} onAsk={jest.fn()} onResolveNeedsYou={jest.fn()} />,
    );
    expect(screen.getByPlaceholderText('Ask Aureus anything about this work…')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <WorkSurfaceView
        matter={matterAt(HOUSING_MATTER.needsYouAt)}
        onAsk={jest.fn()}
        onResolveNeedsYou={jest.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
