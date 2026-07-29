import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { PlanCard, planItemKey } from './PlanCard';
import type { PlanItemDto } from '../../../lib/api/plan';
import type { MatchedResourceDto } from '../../../lib/api/needs';

const recommendationItem: PlanItemDto = {
  source: 'RECOMMENDATION',
  recommendation: {
    id: 'rec-1', userId: 'member-1', opportunityId: 'opp-1', resourceId: null, courseId: null, podId: null,
    rationale: 'This matches your goal.', status: 'PENDING', decidedAt: null, createdAt: 'x',
  },
  cityResource: null,
  categoryLabel: 'Opportunity',
};

const cityResource: MatchedResourceDto = {
  id: 'city-1', citySheetRef: 'AUR-CS-000001', organizationName: 'Chester County Food Bank',
  category: 'FOOD_RESOURCE', description: 'Free groceries weekly.', address: null, serviceArea: 'Chester County',
  phone: null, website: null, hours: 'Mon-Fri 9am-5pm', eligibilityRequirements: null, languagesSupported: [],
  accessibilityNotes: null, cost: null, requiredDocuments: [], referralRequired: false, isEmergencyService: false,
  verificationStatus: 'VERIFIED', isTestFixture: false,
};

const cityResourceItem: PlanItemDto = {
  source: 'CITY_RESOURCE',
  recommendation: null,
  cityResource,
  categoryLabel: 'Verified local resource',
};

describe('planItemKey', () => {
  it('keys a RECOMMENDATION item by its recommendation id', () => {
    expect(planItemKey(recommendationItem)).toBe('recommendation:rec-1');
  });

  it('keys a CITY_RESOURCE item by its city resource id', () => {
    expect(planItemKey(cityResourceItem)).toBe('city-resource:city-1');
  });
});

describe('PlanCard', () => {
  it('labels a Primary RECOMMENDATION item with its role and category', () => {
    render(
      <PlanCard
        item={recommendationItem}
        role="Primary"
        subject={{ title: 'Community Grant', description: 'A grant.' }}
        offerResponse={null}
        deciding={false}
        onApprove={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Opportunity')).toBeInTheDocument();
    expect(screen.getByText('This matches your goal.')).toBeInTheDocument();
    expect(screen.getByText('Community Grant')).toBeInTheDocument();
  });

  it('approves a RECOMMENDATION item via the same Approve action Review & Approval already uses', async () => {
    const onApprove = jest.fn();
    render(
      <PlanCard
        item={recommendationItem}
        role="Primary"
        subject={null}
        offerResponse={null}
        deciding={false}
        onApprove={onApprove}
        onDismiss={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('labels a Supporting CITY_RESOURCE item and presents it via the same accept/decline Gate C already uses', async () => {
    const onApprove = jest.fn();
    render(
      <PlanCard
        item={cityResourceItem}
        role="Supporting"
        subject={null}
        offerResponse={null}
        deciding={false}
        onApprove={onApprove}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByText('Supporting')).toBeInTheDocument();
    expect(screen.getByText('Verified local resource')).toBeInTheDocument();
    expect(screen.getByText('Chester County Food Bank')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('shows the city resource as already decided rather than offering the action again', () => {
    render(
      <PlanCard
        item={cityResourceItem}
        role="Supporting"
        subject={null}
        offerResponse="ACCEPTED"
        deciding={false}
        onApprove={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByText('You accepted this resource.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <PlanCard
        item={recommendationItem}
        role="Primary"
        subject={{ title: 'Community Grant', description: 'A grant.' }}
        offerResponse={null}
        deciding={false}
        onApprove={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
