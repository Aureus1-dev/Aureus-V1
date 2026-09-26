import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PlanItemDto } from '../../../lib/api/plan';
import { PlanCard } from './PlanCard';

const recommendationItem: PlanItemDto = {
  source: 'RECOMMENDATION',
  recommendation: {
    id: 'rec-pending',
    userId: 'member-1',
    opportunityId: 'opp-1',
    resourceId: null,
    courseId: null,
    podId: null,
    rationale: 'This matches your goal.',
    status: 'PENDING',
    decidedAt: null,
    createdAt: 'x',
  },
  cityResource: null,
  categoryLabel: 'Opportunity',
};

function deferredMutation() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('PlanCard decision mutation truth', () => {
  it('does not confirm a recommendation while the authoritative mutation is still pending', async () => {
    const mutation = deferredMutation();
    const onApprove = jest.fn(() => mutation.promise);

    render(
      <PlanCard
        item={recommendationItem}
        role="Primary"
        subject={{ title: 'Community Grant', description: 'A grant.' }}
        offerResponse={null}
        deciding={false}
        onApprove={onApprove}
        onDismiss={jest.fn(async () => undefined)}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Choose this' }));

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('You chose this recommendation.')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Choose what happens next' })).toBeInTheDocument();

    await act(async () => {
      mutation.resolve();
      await mutation.promise;
    });

    expect(await screen.findByText('You chose this recommendation.')).toBeInTheDocument();
  });

  it('does not manufacture confirmation when the authoritative mutation rejects', async () => {
    const mutation = deferredMutation();
    const onApprove = jest.fn(() => mutation.promise);

    render(
      <PlanCard
        item={recommendationItem}
        role="Primary"
        subject={{ title: 'Community Grant', description: 'A grant.' }}
        offerResponse={null}
        deciding={false}
        onApprove={onApprove}
        onDismiss={jest.fn(async () => undefined)}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Choose this' }));

    await act(async () => {
      mutation.reject(new Error('failed'));
      try {
        await mutation.promise;
      } catch {
        // Expected: PlanCard must fail closed and keep the pending decision visible.
      }
    });

    expect(screen.queryByText('You chose this recommendation.')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Choose what happens next' })).toBeInTheDocument();
  });
});
