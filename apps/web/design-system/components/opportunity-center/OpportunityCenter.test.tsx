import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { OpportunitiesProvider } from '../../../state/opportunities/OpportunitiesContext';
import { RecommendationsProvider } from '../../../state/recommendations/RecommendationsContext';
import { OpportunityCenter } from './OpportunityCenter';

import * as opportunitiesApi from '../../../lib/api/opportunities';
import * as savedApi from '../../../lib/api/saved-opportunities';
import * as recommendationsApi from '../../../lib/api/recommendations';

import type { OpportunityDto } from '../../../lib/api/opportunities';
import type { SavedOpportunityDto } from '../../../lib/api/saved-opportunities';
import type { RecommendationDto } from '../../../lib/api/recommendations';

jest.mock('../../../lib/api/opportunities');
jest.mock('../../../lib/api/saved-opportunities');
jest.mock('../../../lib/api/recommendations');

const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;
const mockedSaved = savedApi as jest.Mocked<typeof savedApi>;
const mockedRecommendations = recommendationsApi as jest.Mocked<typeof recommendationsApi>;

const opportunity: OpportunityDto = {
  id: 'opp-1', opportunityRef: null, title: 'Community Grant', shortDescription: 'A grant.', fullDescription: 'x',
  category: 'GRANT', tags: [], provider: 'City Hall', officialSourceUrl: 'https://example.com', applicationUrl: null,
  location: null, country: null, state: null, eligibilityRules: 'x', benefitType: 'GRANT', benefitAmount: null,
  deadline: null, status: 'ACTIVE', verificationStatus: 'VERIFIED', rejectionReason: null, confidenceScore: 90,
  freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'City Hall', sourceUrl: null,
  sourceType: 'ADMIN_ENTRY', submittedById: 'admin-1', createdById: 'admin-1', lastUpdatedById: 'admin-1',
  createdAt: 'x', updatedAt: 'x', deletedAt: null,
};

const savedRecord: SavedOpportunityDto = {
  id: 'saved-1', userId: 'member-1', opportunityId: 'opp-1', isFavorite: false, trackingStatus: 'SAVED',
  notes: null, savedAt: 'x', updatedAt: 'x',
};

function makeRecommendation(o: Partial<RecommendationDto>): RecommendationDto {
  return {
    id: 'rec-1', userId: 'member-1', opportunityId: 'opp-1', resourceId: null, courseId: null, podId: null,
    rationale: 'Matches your goal.', status: 'PENDING', decidedAt: null, createdAt: 'x', ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderCenter() {
  return render(
    <SessionProvider>
      <OpportunitiesProvider>
        <RecommendationsProvider>
          <SignedInAs>
            <OpportunityCenter />
          </SignedInAs>
        </RecommendationsProvider>
      </OpportunitiesProvider>
    </SessionProvider>,
  );
}

describe('OpportunityCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedOpportunities.listOpportunities.mockResolvedValue({
      data: [opportunity], total: 1, page: 1, limit: 20, totalPages: 1,
    });
    mockedSaved.listSavedOpportunities.mockResolvedValue([]);
    mockedRecommendations.listRecommendations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it('asks a signed-out visitor to sign in', () => {
    render(
      <SessionProvider>
        <OpportunitiesProvider>
          <RecommendationsProvider>
            <OpportunityCenter />
          </RecommendationsProvider>
        </OpportunitiesProvider>
      </SessionProvider>,
    );
    expect(screen.getByText('Sign in to see the Opportunity Center')).toBeInTheDocument();
  });

  it(
    "lets a member accomplish the Domain's primary purpose end-to-end: discover an opportunity, save it and track " +
      'progress on it, and get an explainable recommendation to approve — all from one screen, without losing earlier ' +
      'progress when moving between tabs',
    async () => {
      mockedSaved.saveOpportunity.mockResolvedValue(savedRecord);
      mockedSaved.updateSavedOpportunity.mockResolvedValue({ ...savedRecord, trackingStatus: 'APPLYING' });
      mockedOpportunities.getOpportunity.mockResolvedValue(opportunity);
      mockedRecommendations.generateRecommendations.mockResolvedValue([makeRecommendation({})]);
      mockedRecommendations.approveRecommendation.mockResolvedValue(makeRecommendation({ status: 'ACCEPTED', decidedAt: 'x' }));

      renderCenter();

      // Discover, from Search (the default tab).
      expect(await screen.findByText('Community Grant')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(mockedSaved.saveOpportunity).toHaveBeenCalledWith('token-123', 'member-1', 'opp-1');

      // Track it, from Saved.
      await userEvent.click(screen.getByRole('tab', { name: 'Saved' }));
      expect(await screen.findByLabelText('Status')).toHaveValue('SAVED');
      await userEvent.selectOptions(screen.getByLabelText('Status'), 'APPLYING');

      // Get and approve an explainable recommendation, from Recommended —
      // never auto-generated; only after this explicit click.
      await userEvent.click(screen.getByRole('tab', { name: 'Recommended' }));
      expect(mockedRecommendations.generateRecommendations).not.toHaveBeenCalled();
      await userEvent.click(await screen.findByRole('button', { name: 'Get Recommendations' }));
      expect(mockedRecommendations.generateRecommendations).toHaveBeenCalledWith('token-123', 'OPPORTUNITY');
      await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
      expect(mockedRecommendations.approveRecommendation).toHaveBeenCalledWith('token-123', 'rec-1');

      // Back to Search — the original results are still there, not reset.
      await userEvent.click(screen.getByRole('tab', { name: 'Search' }));
      expect(within(screen.getByRole('tabpanel')).getByText('Community Grant')).toBeInTheDocument();
      expect(mockedOpportunities.listOpportunities).toHaveBeenCalledTimes(1);
    },
  );

  it('has no accessibility violations', async () => {
    const { container } = renderCenter();
    await screen.findByText('Community Grant');
    expect(await axe(container)).toHaveNoViolations();
  });
});
