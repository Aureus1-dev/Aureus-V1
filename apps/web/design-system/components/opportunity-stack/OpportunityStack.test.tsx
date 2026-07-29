import { act, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { useEffect } from 'react';
import { OpportunityStack } from './OpportunityStack';
import { OpportunityCard } from '../opportunities/OpportunityCard';
import { HighlightRegistryProvider, useHighlightRegistry } from '../../../state/highlight/HighlightRegistryContext';

const opportunity = {
  id: 'opp-1', opportunityRef: 'AUR-OPP-000001', title: 'Community Grant', shortDescription: 'A grant for the community.',
  fullDescription: 'Full details.', category: 'GRANT' as const, tags: [], provider: 'City Hall',
  officialSourceUrl: 'https://example.com', applicationUrl: null, location: null, country: null, state: null,
  eligibilityRules: 'Open to all', benefitType: 'GRANT' as const, benefitAmount: null, deadline: null,
  status: 'ACTIVE' as const, verificationStatus: 'VERIFIED' as const, rejectionReason: null, confidenceScore: 90,
  freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'City Hall', sourceUrl: null,
  sourceType: 'ADMIN_ENTRY' as const, submittedById: 'admin-1', createdById: 'admin-1', lastUpdatedById: 'admin-1',
  createdAt: 'x', updatedAt: 'x', deletedAt: null,
};

describe('OpportunityStack', () => {
  it('renders children in the stack layout', () => {
    render(
      <OpportunityStack>
        <p>Card one</p>
        <p>Card two</p>
      </OpportunityStack>,
    );
    expect(screen.getByText('Card one')).toBeInTheDocument();
    expect(screen.getByText('Card two')).toBeInTheDocument();
  });

  it('shows a loading state and hides children while loading', () => {
    render(
      <OpportunityStack loading loadingLabel="Finding opportunities">
        <p>Card one</p>
      </OpportunityStack>,
    );
    expect(screen.getByText('Finding opportunities')).toBeInTheDocument();
    expect(screen.queryByText('Card one')).not.toBeInTheDocument();
  });

  it('shows an error state with an action', () => {
    render(
      <OpportunityStack error={{ title: 'Connection interrupted', action: <button>Try again</button> }}>
        <p>Card one</p>
      </OpportunityStack>,
    );
    expect(screen.getByText('Connection interrupted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    render(
      <OpportunityStack isEmpty emptyTitle="No opportunities yet">
        <p>Card one</p>
      </OpportunityStack>,
    );
    expect(screen.getByText('No opportunities yet')).toBeInTheDocument();
    expect(screen.queryByText('Card one')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <OpportunityStack>
        <p>Card one</p>
      </OpportunityStack>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('still registers a nested OpportunityCard as Opportunity.Card.<id> in the Global Highlight Registry — the extra layout nesting does not break voice-steward highlighting', () => {
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
        <OpportunityStack>
          <OpportunityCard opportunity={opportunity} saved={false} onToggleSave={jest.fn()} onOpen={jest.fn()} />
        </OpportunityStack>
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
