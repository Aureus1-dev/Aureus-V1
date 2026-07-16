import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useEffect } from 'react';
import { OpportunityCard } from './OpportunityCard';
import { HighlightRegistryProvider, useHighlightRegistry } from '../../../state/highlight/HighlightRegistryContext';

const opportunity = {
  id: 'opp-1', opportunityRef: 'AUR-OPP-000001', title: 'Community Grant', shortDescription: 'A grant for the community.',
  fullDescription: 'Full details.', category: 'GRANT' as const, tags: [], provider: 'City Hall',
  officialSourceUrl: 'https://example.com', applicationUrl: null, location: null, country: null, state: null,
  eligibilityRules: 'Open to all', benefitType: 'GRANT' as const, benefitAmount: null, deadline: '2026-08-01T00:00:00.000Z',
  status: 'ACTIVE' as const, verificationStatus: 'VERIFIED' as const, rejectionReason: null, confidenceScore: 90,
  freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'City Hall', sourceUrl: null,
  sourceType: 'ADMIN_ENTRY' as const, submittedById: 'admin-1', createdById: 'admin-1', lastUpdatedById: 'admin-1',
  createdAt: 'x', updatedAt: 'x', deletedAt: null,
};

describe('OpportunityCard', () => {
  it('renders title, category, deadline, and save/open actions', async () => {
    const onToggleSave = jest.fn();
    const onOpen = jest.fn();
    render(<OpportunityCard opportunity={opportunity} saved={false} onToggleSave={onToggleSave} onOpen={onOpen} />);

    expect(screen.getByText('Community Grant')).toBeInTheDocument();
    expect(screen.getByText('Grant')).toBeInTheDocument();
    expect(screen.getByText(/Deadline/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onToggleSave).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'View details' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('reflects the saved state', () => {
    render(<OpportunityCard opportunity={opportunity} saved onToggleSave={jest.fn()} onOpen={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OpportunityCard opportunity={opportunity} saved={false} onToggleSave={jest.fn()} onOpen={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('registers as Opportunity.Card.<id> in the Global Highlight Registry so the voice steward can point it out (DOMAIN-005)', () => {
    let api!: ReturnType<typeof useHighlightRegistry>;
    function Harness() {
      const registry = useHighlightRegistry();
      useEffect(() => {
        api = registry;
      });
      return null;
    }

    render(
      <HighlightRegistryProvider>
        <OpportunityCard opportunity={opportunity} saved={false} onToggleSave={jest.fn()} onOpen={jest.fn()} />
        <Harness />
      </HighlightRegistryProvider>,
    );

    let found = false;
    act(() => {
      found = api.activate('Opportunity.Card.opp-1');
    });
    expect(found).toBe(true);
  });
});
