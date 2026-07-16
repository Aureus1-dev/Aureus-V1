import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { OpportunitiesProvider } from '../../../state/opportunities/OpportunitiesContext';
import { SavedTab } from './SavedTab';
import * as opportunitiesApi from '../../../lib/api/opportunities';
import * as savedApi from '../../../lib/api/saved-opportunities';
import type { OpportunityDto } from '../../../lib/api/opportunities';
import type { SavedOpportunityDto } from '../../../lib/api/saved-opportunities';

jest.mock('../../../lib/api/opportunities');
jest.mock('../../../lib/api/saved-opportunities');

const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;
const mockedSaved = savedApi as jest.Mocked<typeof savedApi>;

const savedRecord: SavedOpportunityDto = {
  id: 'saved-1', userId: 'member-1', opportunityId: 'opp-1', isFavorite: false, trackingStatus: 'SAVED',
  notes: null, savedAt: 'x', updatedAt: 'x',
};

const opportunity: OpportunityDto = {
  id: 'opp-1', opportunityRef: null, title: 'Community Grant', shortDescription: 'A grant.', fullDescription: 'x',
  category: 'GRANT', tags: [], provider: 'City Hall', officialSourceUrl: 'https://example.com', applicationUrl: null,
  location: null, country: null, state: null, eligibilityRules: 'x', benefitType: 'GRANT', benefitAmount: null,
  deadline: null, status: 'ACTIVE', verificationStatus: 'VERIFIED', rejectionReason: null, confidenceScore: 90,
  freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'City Hall', sourceUrl: null,
  sourceType: 'ADMIN_ENTRY', submittedById: 'admin-1', createdById: 'admin-1', lastUpdatedById: 'admin-1',
  createdAt: 'x', updatedAt: 'x', deletedAt: null,
};

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderSavedTab() {
  return render(
    <SessionProvider>
      <OpportunitiesProvider>
        <SignedInAs>
          <SavedTab />
        </SignedInAs>
      </OpportunitiesProvider>
    </SessionProvider>,
  );
}

describe('SavedTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads saved opportunities, resolves their details, and renders them', async () => {
    mockedSaved.listSavedOpportunities.mockResolvedValue([savedRecord]);
    mockedOpportunities.getOpportunity.mockResolvedValue(opportunity);

    renderSavedTab();

    expect(await screen.findByText('Community Grant')).toBeInTheDocument();
    expect(mockedOpportunities.getOpportunity).toHaveBeenCalledWith('token-123', 'opp-1');
  });

  it('shows an empty state when nothing is saved', async () => {
    mockedSaved.listSavedOpportunities.mockResolvedValue([]);

    renderSavedTab();
    expect(await screen.findByText('Nothing saved yet')).toBeInTheDocument();
  });

  it('removing a saved item calls the remove endpoint', async () => {
    mockedSaved.listSavedOpportunities.mockResolvedValue([savedRecord]);
    mockedOpportunities.getOpportunity.mockResolvedValue(opportunity);
    mockedSaved.removeSavedOpportunity.mockResolvedValue(undefined);

    renderSavedTab();
    await screen.findByText('Community Grant');

    await userEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(mockedSaved.removeSavedOpportunity).toHaveBeenCalledWith('token-123', 'member-1', 'opp-1');
  });

  it('has no accessibility violations', async () => {
    mockedSaved.listSavedOpportunities.mockResolvedValue([savedRecord]);
    mockedOpportunities.getOpportunity.mockResolvedValue(opportunity);

    const { container } = renderSavedTab();
    await screen.findByText('Community Grant');
    expect(await axe(container)).toHaveNoViolations();
  });
});
