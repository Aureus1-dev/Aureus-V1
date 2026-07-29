import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoordinatedPlanStep } from './CoordinatedPlanStep';
import type { CoordinatedPlanDto, PlanItemDto } from '../../../../lib/api/plan';

const primary: PlanItemDto = {
  source: 'RECOMMENDATION',
  recommendation: {
    id: 'rec-1', userId: 'member-1', opportunityId: 'opp-1', resourceId: null, courseId: null, podId: null,
    rationale: 'This matches your goal.', status: 'PENDING', decidedAt: null, createdAt: 'x',
  },
  cityResource: null,
  categoryLabel: 'Opportunity',
};

const supporting: PlanItemDto = {
  source: 'RECOMMENDATION',
  recommendation: {
    id: 'rec-2', userId: 'member-1', opportunityId: null, resourceId: 'res-1', courseId: null, podId: null,
    rationale: 'This could also help.', status: 'PENDING', decidedAt: null, createdAt: 'x',
  },
  cityResource: null,
  categoryLabel: 'Resource',
};

const plan: CoordinatedPlanDto = {
  primary,
  supporting: [supporting],
  combinedRationale: 'Opportunity addresses this most directly; Resource rounds it out.',
  additionalPossibilitiesCount: 2,
};

describe('CoordinatedPlanStep', () => {
  it('shows a loading state while building', () => {
    render(
      <CoordinatedPlanStep
        plan={null}
        building
        error={null}
        subjectsById={{}}
        offerResponseByCityResourceId={{}}
        isDeciding={() => false}
        onApprove={jest.fn()}
        onDismiss={jest.fn()}
        onRetry={jest.fn()}
        onContinue={jest.fn()}
      />,
    );
    expect(screen.getByText('Coordinating your plan')).toBeInTheDocument();
  });

  it('renders exactly one Primary item and its Supporting items, never a plain list', () => {
    render(
      <CoordinatedPlanStep
        plan={plan}
        building={false}
        error={null}
        subjectsById={{}}
        offerResponseByCityResourceId={{}}
        isDeciding={() => false}
        onApprove={jest.fn()}
        onDismiss={jest.fn()}
        onRetry={jest.fn()}
        onContinue={jest.fn()}
      />,
    );
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Supporting')).toBeInTheDocument();
    expect(screen.getByText(plan.combinedRationale)).toBeInTheDocument();
    expect(screen.getByText('This matches your goal.')).toBeInTheDocument();
    expect(screen.getByText('This could also help.')).toBeInTheDocument();
  });

  it('mentions the additional possibilities held in reserve, without ever listing them up front', () => {
    render(
      <CoordinatedPlanStep
        plan={plan}
        building={false}
        error={null}
        subjectsById={{}}
        offerResponseByCityResourceId={{}}
        isDeciding={() => false}
        onApprove={jest.fn()}
        onDismiss={jest.fn()}
        onRetry={jest.fn()}
        onContinue={jest.fn()}
      />,
    );
    expect(screen.getByText(/2 more real possibilities/)).toBeInTheDocument();
  });

  it('routes an approval on a specific plan item back to the caller with that item', async () => {
    const onApprove = jest.fn();
    render(
      <CoordinatedPlanStep
        plan={plan}
        building={false}
        error={null}
        subjectsById={{}}
        offerResponseByCityResourceId={{}}
        isDeciding={() => false}
        onApprove={onApprove}
        onDismiss={jest.fn()}
        onRetry={jest.fn()}
        onContinue={jest.fn()}
      />,
    );

    const approveButtons = screen.getAllByRole('button', { name: 'Approve' });
    expect(approveButtons).toHaveLength(2);
    await userEvent.click(approveButtons[0]);
    expect(onApprove).toHaveBeenCalledWith(primary);
  });

  it('shows a retryable error with a retry action', async () => {
    const onRetry = jest.fn();
    render(
      <CoordinatedPlanStep
        plan={null}
        building={false}
        error={{ kind: 'unavailable', message: 'The AI service is temporarily unavailable', retryable: true }}
        subjectsById={{}}
        offerResponseByCityResourceId={{}}
        isDeciding={() => false}
        onApprove={jest.fn()}
        onDismiss={jest.fn()}
        onRetry={onRetry}
        onContinue={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('lets the member continue even with no plan available (a NO_ACTION run)', async () => {
    const onContinue = jest.fn();
    render(
      <CoordinatedPlanStep
        plan={null}
        building={false}
        error={null}
        subjectsById={{}}
        offerResponseByCityResourceId={{}}
        isDeciding={() => false}
        onApprove={jest.fn()}
        onDismiss={jest.fn()}
        onRetry={jest.fn()}
        onContinue={onContinue}
      />,
    );
    expect(screen.getByText('Nothing to coordinate yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
