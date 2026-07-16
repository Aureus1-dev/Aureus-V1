import { render, screen, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { OpportunitiesProvider } from '../../../state/opportunities/OpportunitiesContext';
import { OpportunityHighlights } from './OpportunityHighlights';
import * as opportunitiesApi from '../../../lib/api/opportunities';
import * as savedApi from '../../../lib/api/saved-opportunities';
import type { OpportunityDto } from '../../../lib/api/opportunities';

jest.mock('../../../lib/api/opportunities');
jest.mock('../../../lib/api/saved-opportunities');

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;
const mockedSaved = savedApi as jest.Mocked<typeof savedApi>;

function makeOpportunity(o: Partial<OpportunityDto>): OpportunityDto {
  return {
    id: 'o-1', opportunityRef: null, title: 'Community Grant', shortDescription: 'A short description',
    fullDescription: 'A full description', category: 'GRANT', tags: [], provider: 'City Fund',
    officialSourceUrl: 'https://example.com', applicationUrl: null, location: null, country: null, state: null,
    eligibilityRules: 'Open to all', benefitType: 'GRANT', benefitAmount: null, deadline: null, status: 'ACTIVE',
    verificationStatus: 'VERIFIED', rejectionReason: null, confidenceScore: 0.9, freshnessScore: 0.9,
    datePublished: null, dateLastVerified: null, sourceName: 'City Fund', sourceUrl: null, sourceType: 'ADMIN_ENTRY',
    submittedById: 'u-1', createdById: 'u-1', lastUpdatedById: 'u-1', createdAt: 'x', updatedAt: 'x', deletedAt: null,
    ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderHighlights() {
  return render(
    <SessionProvider>
      <OpportunitiesProvider>
        <SignedInAs>
          <OpportunityHighlights />
        </SignedInAs>
      </OpportunitiesProvider>
    </SessionProvider>,
  );
}

describe('OpportunityHighlights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows up to 3 confidence-ranked opportunities', async () => {
    mockedOpportunities.listOpportunities.mockResolvedValue({
      data: [makeOpportunity({ id: 'o-1', title: 'Community Grant' }), makeOpportunity({ id: 'o-2', title: 'Job Training Program' })],
      total: 2, page: 1, limit: 3, totalPages: 1,
    });

    renderHighlights();

    expect(await screen.findByText('Community Grant')).toBeInTheDocument();
    expect(screen.getByText('Job Training Program')).toBeInTheDocument();
    expect(mockedOpportunities.listOpportunities).toHaveBeenCalledWith('token-123', {
      limit: 3, sortBy: 'confidence', sortOrder: 'desc',
    });
  });

  it('renders nothing when there are no results', async () => {
    mockedOpportunities.listOpportunities.mockResolvedValue({ data: [], total: 0, page: 1, limit: 3, totalPages: 0 });
    const { container } = renderHighlights();
    await waitFor(() => expect(mockedOpportunities.listOpportunities).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    mockedOpportunities.listOpportunities.mockResolvedValue({
      data: [makeOpportunity({ id: 'o-1' })], total: 1, page: 1, limit: 3, totalPages: 1,
    });
    const { container } = renderHighlights();
    await screen.findByText('Community Grant');
    expect(await axe(container)).toHaveNoViolations();
  });
});
