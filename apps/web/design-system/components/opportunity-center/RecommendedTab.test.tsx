import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { RecommendationsProvider } from '../../../state/recommendations/RecommendationsContext';
import { RecommendedTab } from './RecommendedTab';
import * as recommendationsApi from '../../../lib/api/recommendations';
import * as opportunitiesApi from '../../../lib/api/opportunities';
import type { RecommendationDto } from '../../../lib/api/recommendations';
import type { OpportunityDto } from '../../../lib/api/opportunities';

jest.mock('../../../lib/api/recommendations');
jest.mock('../../../lib/api/opportunities');

const mockedRecommendations = recommendationsApi as jest.Mocked<typeof recommendationsApi>;
const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;

function makeRecommendation(o: Partial<RecommendationDto>): RecommendationDto {
  return {
    id: 'rec-1', userId: 'member-1', opportunityId: 'opp-1', resourceId: null, courseId: null, podId: null,
    rationale: 'Matches your goal of finding stable income.', status: 'PENDING', decidedAt: null, createdAt: 'x', ...o,
  };
}

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

function renderTab() {
  return render(
    <SessionProvider>
      <RecommendationsProvider>
        <SignedInAs>
          <RecommendedTab />
        </SignedInAs>
      </RecommendationsProvider>
    </SessionProvider>,
  );
}

describe('RecommendedTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads existing recommendations on mount without generating new ones', async () => {
    mockedRecommendations.listRecommendations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    renderTab();

    await screen.findByText('No recommendations yet');
    expect(mockedRecommendations.listRecommendations).toHaveBeenCalledWith('token-123');
    expect(mockedRecommendations.generateRecommendations).not.toHaveBeenCalled();
  });

  it('renders pending recommendations with resolved subject and lets a member approve one', async () => {
    mockedRecommendations.listRecommendations.mockResolvedValue({
      data: [makeRecommendation({})], total: 1, page: 1, limit: 20, totalPages: 1,
    });
    mockedOpportunities.getOpportunity.mockResolvedValue(makeOpportunity({}));
    mockedRecommendations.approveRecommendation.mockResolvedValue(makeRecommendation({ status: 'ACCEPTED', decidedAt: 'x' }));

    renderTab();

    expect(await screen.findByText('Community Grant')).toBeInTheDocument();
    expect(screen.getByText('Matches your goal of finding stable income.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(mockedRecommendations.approveRecommendation).toHaveBeenCalledWith('token-123', 'rec-1');
  });

  it('clicking "Get Recommendations" explicitly generates new ones', async () => {
    mockedRecommendations.listRecommendations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedRecommendations.generateRecommendations.mockResolvedValue([makeRecommendation({})]);
    mockedOpportunities.getOpportunity.mockResolvedValue(makeOpportunity({}));

    renderTab();
    await screen.findByText('No recommendations yet');

    await userEvent.click(screen.getByRole('button', { name: 'Get Recommendations' }));
    expect(mockedRecommendations.generateRecommendations).toHaveBeenCalledWith('token-123', 'OPPORTUNITY');
    expect(await screen.findByText('Community Grant')).toBeInTheDocument();
  });

  it('shows already-decided recommendations under "Previously reviewed"', async () => {
    mockedRecommendations.listRecommendations.mockResolvedValue({
      data: [makeRecommendation({ id: 'rec-2', status: 'DISMISSED', decidedAt: 'x' })],
      total: 1, page: 1, limit: 20, totalPages: 1,
    });
    mockedOpportunities.getOpportunity.mockResolvedValue(makeOpportunity({}));

    renderTab();

    expect(await screen.findByText('Previously reviewed')).toBeInTheDocument();
    expect(screen.getByText('Dismissed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    mockedRecommendations.listRecommendations.mockResolvedValue({
      data: [makeRecommendation({})], total: 1, page: 1, limit: 20, totalPages: 1,
    });
    mockedOpportunities.getOpportunity.mockResolvedValue(makeOpportunity({}));

    const { container } = renderTab();
    await screen.findByText('Community Grant');
    expect(await axe(container)).toHaveNoViolations();
  });
});
