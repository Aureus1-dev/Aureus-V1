import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { OpportunitiesProvider } from '../../../state/opportunities/OpportunitiesContext';
import { SearchTab } from './SearchTab';
import * as opportunitiesApi from '../../../lib/api/opportunities';
import * as savedApi from '../../../lib/api/saved-opportunities';
import type { OpportunityDto } from '../../../lib/api/opportunities';

jest.mock('../../../lib/api/opportunities');
jest.mock('../../../lib/api/saved-opportunities');

const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;
const mockedSaved = savedApi as jest.Mocked<typeof savedApi>;

function makeOpportunity(o: Partial<OpportunityDto>): OpportunityDto {
  return {
    id: 'opp-1', opportunityRef: null, title: 'Community Grant', shortDescription: 'A grant.', fullDescription: 'x',
    category: 'GRANT', tags: [], provider: 'City Hall', officialSourceUrl: 'https://example.com', applicationUrl: null,
    location: null, country: null, state: null, eligibilityRules: 'x', benefitType: 'GRANT', benefitAmount: null,
    deadline: null, status: 'ACTIVE', verificationStatus: 'VERIFIED', rejectionReason: null, confidenceScore: 90,
    freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'City Hall', sourceUrl: null,
    sourceType: 'ADMIN_ENTRY', submittedById: 'admin-1', createdById: 'admin-1', lastUpdatedById: 'admin-1',
    createdAt: 'x', updatedAt: 'x', deletedAt: null, ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderSearchTab() {
  return render(
    <SessionProvider>
      <OpportunitiesProvider>
        <SignedInAs>
          <SearchTab />
        </SignedInAs>
      </OpportunitiesProvider>
    </SessionProvider>,
  );
}

describe('SearchTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSaved.saveOpportunity.mockResolvedValue({
      id: 'saved-1', userId: 'member-1', opportunityId: 'opp-1', isFavorite: false, trackingStatus: 'SAVED',
      notes: null, savedAt: 'x', updatedAt: 'x',
    });
  });

  it('searches on mount and renders results', async () => {
    mockedOpportunities.listOpportunities.mockResolvedValue({
      data: [makeOpportunity({})], total: 1, page: 1, limit: 20, totalPages: 1,
    });

    renderSearchTab();

    expect(await screen.findByText('Community Grant')).toBeInTheDocument();
    expect(mockedOpportunities.listOpportunities).toHaveBeenCalledWith('token-123', {});
  });

  it('shows a "Load more" control only when another page exists, and appends on click', async () => {
    mockedOpportunities.listOpportunities
      .mockResolvedValueOnce({ data: [makeOpportunity({ id: 'opp-1', title: 'First Grant' })], total: 2, page: 1, limit: 1, totalPages: 2 })
      .mockResolvedValueOnce({ data: [makeOpportunity({ id: 'opp-2', title: 'Second Grant' })], total: 2, page: 2, limit: 1, totalPages: 2 });

    renderSearchTab();
    await screen.findByText('First Grant');

    const loadMore = screen.getByRole('button', { name: 'Load more' });
    await userEvent.click(loadMore);

    expect(await screen.findByText('Second Grant')).toBeInTheDocument();
    expect(screen.getByText('First Grant')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('opens a result into detail view and back again', async () => {
    mockedOpportunities.listOpportunities.mockResolvedValue({
      data: [makeOpportunity({})], total: 1, page: 1, limit: 20, totalPages: 1,
    });

    renderSearchTab();
    await userEvent.click(await screen.findByRole('button', { name: 'View details' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Community Grant' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Back to results/ }));
    expect(screen.queryByRole('heading', { level: 2, name: 'Community Grant' })).not.toBeInTheDocument();
    expect(screen.getByText('Community Grant')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    mockedOpportunities.listOpportunities.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    renderSearchTab();
    expect(await screen.findByText('No opportunities found')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    mockedOpportunities.listOpportunities.mockResolvedValue({
      data: [makeOpportunity({})], total: 1, page: 1, limit: 20, totalPages: 1,
    });
    const { container } = renderSearchTab();
    await screen.findByText('Community Grant');
    await waitFor(() => expect(container).toBeTruthy());
    expect(await axe(container)).toHaveNoViolations();
  });
});
