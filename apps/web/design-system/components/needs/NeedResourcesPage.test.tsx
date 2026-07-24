import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { NeedResourcesPage } from './NeedResourcesPage';
import * as needsApi from '../../../lib/api/needs';
import type { MatchedResourceDto, ResourceOfferDto } from '../../../lib/api/needs';

jest.mock('../../../lib/api/needs');

const mockedApi = needsApi as jest.Mocked<typeof needsApi>;

function makeResource(o: Partial<MatchedResourceDto> = {}): MatchedResourceDto {
  return {
    id: 'entry-001', citySheetRef: 'AUR-CS-000001', organizationName: 'Chester County Food Bank',
    category: 'FOOD_RESOURCE', description: 'Provides groceries to families in need.',
    address: null, serviceArea: 'Chester County', phone: null, website: null, hours: 'Mon-Fri 9am-5pm',
    eligibilityRequirements: null, languagesSupported: [], accessibilityNotes: null, cost: null,
    requiredDocuments: [], referralRequired: false, isEmergencyService: false,
    verificationStatus: 'VERIFIED', isTestFixture: false, ...o,
  };
}

function makeOffer(o: Partial<ResourceOfferDto> = {}): ResourceOfferDto {
  return {
    id: 'offer-001', statedNeedId: 'need-001', citySheetEntryId: 'entry-001',
    response: 'PENDING', offeredAt: '2026-01-01T00:00:00Z', respondedAt: null, ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderPage() {
  return render(
    <SessionProvider>
      <SignedInAs>
        <NeedResourcesPage needId="need-001" />
      </SignedInAs>
    </SessionProvider>,
  );
}

describe('NeedResourcesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the matched resource with its verification badge', async () => {
    mockedApi.getMatchingResources.mockResolvedValue([makeResource()]);
    mockedApi.getOffers.mockResolvedValue([]);
    mockedApi.offerResource.mockResolvedValue(makeOffer());

    renderPage();

    expect(await screen.findByText('Chester County Food Bank')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(mockedApi.offerResource).toHaveBeenCalledWith('token-123', 'need-001', 'entry-001');
  });

  it('shows the unavailable empty state when no resource matches', async () => {
    mockedApi.getMatchingResources.mockResolvedValue([]);
    mockedApi.getOffers.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('No resources found yet')).toBeInTheDocument();
  });

  it("records the member's acceptance and reflects it back", async () => {
    mockedApi.getMatchingResources.mockResolvedValue([makeResource()]);
    mockedApi.getOffers.mockResolvedValue([]);
    mockedApi.offerResource.mockResolvedValue(makeOffer());
    mockedApi.respondToOffer.mockResolvedValue(makeOffer({ response: 'ACCEPTED', respondedAt: '2026-01-01T00:05:00Z' }));

    renderPage();
    await screen.findByText('Chester County Food Bank');

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(screen.getByText('You accepted this resource.')).toBeInTheDocument());
    expect(mockedApi.respondToOffer).toHaveBeenCalledWith('token-123', 'need-001', 'entry-001', true);
  });

  it('shows an error state when loading fails', async () => {
    mockedApi.getMatchingResources.mockRejectedValue(new Error('network down'));

    renderPage();

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('has no accessibility violations once loaded', async () => {
    mockedApi.getMatchingResources.mockResolvedValue([makeResource()]);
    mockedApi.getOffers.mockResolvedValue([]);
    mockedApi.offerResource.mockResolvedValue(makeOffer());

    const { container } = renderPage();
    await screen.findByText('Chester County Food Bank');

    expect(await axe(container)).toHaveNoViolations();
  });
});
