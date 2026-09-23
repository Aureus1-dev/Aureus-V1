import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { PlanCard, planItemKey } from './PlanCard';
import type { PlanItemDto } from '../../../lib/api/plan';
import type { MatchedResourceDto } from '../../../lib/api/needs';

const recommendationItem: PlanItemDto = {
  source: 'RECOMMENDATION',
  recommendation: {
    id: 'rec-1',
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

const cityResource: MatchedResourceDto = {
  id: 'city-1',
  citySheetRef: 'AUR-CS-000001',
  organizationName: 'Chester County Food Bank',
  category: 'FOOD_RESOURCE',
  description: 'Free groceries weekly.',
  address: null,
  serviceArea: 'Chester County',
  phone: null,
  website: null,
  hours: 'Mon-Fri 9am-5pm',
  eligibilityRequirements: 'Lives in Chester County',
  languagesSupported: ['English', 'Spanish'],
  accessibilityNotes: 'Wheelchair accessible',
  cost: '$0',
  requiredDocuments: ['Photo ID'],
  referralRequired: false,
  isEmergencyService: false,
  verificationStatus: 'VERIFIED',
  isTestFixture: false,
};

const cityResourceItem: PlanItemDto = {
  source: 'CITY_RESOURCE',
  recommendation: null,
  cityResource,
  categoryLabel: 'Verified local resource',
};

function renderRecommendation(
  item: PlanItemDto = recommendationItem,
  subject: { title: string; description?: string } | null = {
    title: 'Community Grant',
    description: 'A grant.',
  },
  callbacks: { onApprove?: jest.Mock; onDismiss?: jest.Mock } = {},
) {
  return render(
    <PlanCard
      item={item}
      role="Primary"
      subject={subject}
      offerResponse={null}
      deciding={false}
      onApprove={callbacks.onApprove ?? jest.fn()}
      onDismiss={callbacks.onDismiss ?? jest.fn()}
    />,
  );
}

function renderResource(
  resource: MatchedResourceDto = cityResource,
  offerResponse: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null = 'PENDING',
  callbacks: { onApprove?: jest.Mock; onDismiss?: jest.Mock } = {},
) {
  return render(
    <PlanCard
      item={{ ...cityResourceItem, cityResource: resource }}
      role="Supporting"
      subject={null}
      offerResponse={offerResponse}
      deciding={false}
      onApprove={callbacks.onApprove ?? jest.fn()}
      onDismiss={callbacks.onDismiss ?? jest.fn()}
    />,
  );
}

describe('planItemKey', () => {
  it('keys a RECOMMENDATION item by its recommendation id', () => {
    expect(planItemKey(recommendationItem)).toBe('recommendation:rec-1');
  });

  it('keys a CITY_RESOURCE item by its city resource id', () => {
    expect(planItemKey(cityResourceItem)).toBe('city-resource:city-1');
  });
});

describe('PlanCard — UI-007 Choosing', () => {
  it('renders a pending recommendation as an explicit member-owned choice with source-backed rationale', async () => {
    const onApprove = jest.fn();
    const onDismiss = jest.fn();
    renderRecommendation(recommendationItem, undefined, { onApprove, onDismiss });

    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Opportunity')).toBeInTheDocument();
    expect(screen.getByText('Community Grant')).toBeInTheDocument();
    expect(screen.getByText('A grant.')).toBeInTheDocument();
    expect(screen.getByText('This matches your goal.')).toBeInTheDocument();

    const choice = screen.getByRole('region', { name: 'Choose what happens next' });
    expect(within(choice).getByText('Your authority')).toBeInTheDocument();
    expect(
      within(choice).getByText(/Choosing this records your approval in Aureus/i),
    ).toBeInTheDocument();
    expect(within(choice).queryByText(/confidence|probability|score/i)).not.toBeInTheDocument();

    await userEvent.click(within(choice).getByRole('button', { name: 'Choose this' }));
    expect(onApprove).toHaveBeenCalledTimes(1);

    await userEvent.click(within(choice).getByRole('button', { name: 'Not this' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a pending recommendation target has not resolved yet', () => {
    renderRecommendation(recommendationItem, null);

    expect(screen.queryByRole('region', { name: 'Choose what happens next' })).not.toBeInTheDocument();
    expect(screen.getByText(/Decision details are not available yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose this' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Not this' })).not.toBeInTheDocument();
  });

  it.each([
    ['ACCEPTED', 'You chose this recommendation.'],
    ['DISMISSED', 'You chose not to use this recommendation.'],
  ] as const)('removes recommendation controls after %s truth is recorded', (status, copy) => {
    const item: PlanItemDto = {
      ...recommendationItem,
      recommendation: { ...recommendationItem.recommendation!, status },
    };
    renderRecommendation(item);

    expect(screen.getByText(copy)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choose what happens next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose this' })).not.toBeInTheDocument();
  });

  it('renders only source-backed resource tradeoffs and keeps Primary/Supporting as roles, not competing alternatives', async () => {
    const onApprove = jest.fn();
    renderResource(cityResource, 'PENDING', { onApprove });

    expect(screen.getByText('Supporting')).toBeInTheDocument();
    expect(screen.getByText('Verified local resource')).toBeInTheDocument();
    expect(screen.getByText('Chester County Food Bank')).toBeInTheDocument();

    const choice = screen.getByRole('region', { name: 'Choose what happens next' });
    expect(within(choice).getByText('$0')).toBeInTheDocument();
    expect(within(choice).getByText('Lives in Chester County')).toBeInTheDocument();
    expect(within(choice).getByText('Photo ID')).toBeInTheDocument();
    expect(within(choice).getByText('Not required')).toBeInTheDocument();
    expect(within(choice).getByText('Chester County')).toBeInTheDocument();
    expect(within(choice).getByText('Mon-Fri 9am-5pm')).toBeInTheDocument();
    expect(within(choice).getByText('Wheelchair accessible')).toBeInTheDocument();
    expect(within(choice).getByText('English, Spanish')).toBeInTheDocument();
    expect(within(choice).getByText('No')).toBeInTheDocument();
    expect(within(choice).queryByText(/better|best|alternative|winner/i)).not.toBeInTheDocument();

    await userEvent.click(within(choice).getByRole('button', { name: 'Use this resource' }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('states verification uncertainty without relabeling a resource as verified', () => {
    renderResource({ ...cityResource, verificationStatus: 'NEEDS_REVIEW' });

    const choice = screen.getByRole('region', { name: 'Choose what happens next' });
    expect(
      within(choice).getByText('Aureus has marked this resource as needing verification review.'),
    ).toBeInTheDocument();
    expect(within(choice).queryByText(/verified by Aureus/i)).not.toBeInTheDocument();
  });

  it('does not expose a resource decision before the real offer exists', () => {
    renderResource(cityResource, null);

    expect(screen.getByText('This resource offer is not ready for a decision yet.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choose what happens next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use this resource' })).not.toBeInTheDocument();
  });

  it('does not ask the member to choose a resource rejected by verification', () => {
    renderResource({ ...cityResource, verificationStatus: 'REJECTED' }, 'PENDING');

    expect(
      screen.getByText(/did not accept this resource through verification/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choose what happens next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use this resource' })).not.toBeInTheDocument();
  });

  it.each([
    ['ACCEPTED', 'You accepted this resource.'],
    ['DECLINED', 'You declined this resource.'],
  ] as const)('removes resource controls after %s truth is recorded', (response, copy) => {
    renderResource(cityResource, response);

    expect(screen.getByText(copy)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Choose what happens next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use this resource' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations for a source-backed pending resource choice', async () => {
    const { container } = renderResource(cityResource, 'PENDING');
    expect(await axe(container)).toHaveNoViolations();
  });
});
