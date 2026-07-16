import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { OpportunitiesProvider, useOpportunities } from './OpportunitiesContext';
import * as opportunitiesApi from '../../lib/api/opportunities';
import * as savedApi from '../../lib/api/saved-opportunities';

jest.mock('../../lib/api/opportunities');
jest.mock('../../lib/api/saved-opportunities');

const mockedOpportunities = opportunitiesApi as jest.Mocked<typeof opportunitiesApi>;
const mockedSaved = savedApi as jest.Mocked<typeof savedApi>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useOpportunities> & { setToken: (t: string) => void }) => void }) {
  const opportunities = useOpportunities();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...opportunities,
      setToken: (token: string) => setSession({ ...session, isAuthenticated: true, accessToken: token, memberId: 'member-1' }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunities, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useOpportunities> & { setToken: (t: string) => void };
  render(
    <SessionProvider>
      <OpportunitiesProvider>
        <Harness onReady={(value) => (api = value)} />
      </OpportunitiesProvider>
    </SessionProvider>,
  );
  return () => api;
}

const opportunity = {
  id: 'opp-1', opportunityRef: 'AUR-OPP-000001', title: 'Community Grant', shortDescription: 'A grant.',
  fullDescription: 'A grant for the community.', category: 'GRANT' as const, tags: [], provider: 'City Hall',
  officialSourceUrl: 'https://example.com', applicationUrl: null, location: null, country: null, state: null,
  eligibilityRules: 'Open to all', benefitType: 'GRANT' as const, benefitAmount: null, deadline: null,
  status: 'ACTIVE' as const, verificationStatus: 'VERIFIED' as const, rejectionReason: null, confidenceScore: 90,
  freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'City Hall', sourceUrl: null,
  sourceType: 'ADMIN_ENTRY' as const, submittedById: 'admin-1', createdById: 'admin-1', lastUpdatedById: 'admin-1',
  createdAt: 'x', updatedAt: 'x', deletedAt: null,
};

const savedRecord = {
  id: 'saved-1', userId: 'member-1', opportunityId: 'opp-1', isFavorite: false, trackingStatus: 'SAVED' as const,
  notes: null, savedAt: 'x', updatedAt: 'x',
};

describe('OpportunitiesContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches and stores results with pagination metadata', async () => {
    mockedOpportunities.listOpportunities.mockResolvedValue({ data: [opportunity], total: 1, page: 1, limit: 20, totalPages: 1 });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().search({ q: 'grant' });
    });

    expect(mockedOpportunities.listOpportunities).toHaveBeenCalledWith('token-123', { q: 'grant' });
    expect(getApi().state.results).toEqual([opportunity]);
    expect(getApi().state.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it('loads saved opportunities and reports save state', async () => {
    mockedSaved.listSavedOpportunities.mockResolvedValue([savedRecord]);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().loadSaved();
    });

    expect(mockedSaved.listSavedOpportunities).toHaveBeenCalledWith('token-123', 'member-1');
    expect(getApi().isSaved('opp-1')).toBe(true);
    expect(getApi().isSaved('opp-2')).toBe(false);
  });

  it('toggles save on and off', async () => {
    mockedSaved.saveOpportunity.mockResolvedValue(savedRecord);
    mockedSaved.removeSavedOpportunity.mockResolvedValue(undefined);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));

    await act(async () => {
      await getApi().toggleSave('opp-1');
    });
    expect(mockedSaved.saveOpportunity).toHaveBeenCalledWith('token-123', 'member-1', 'opp-1');
    expect(getApi().isSaved('opp-1')).toBe(true);

    await act(async () => {
      await getApi().toggleSave('opp-1');
    });
    expect(mockedSaved.removeSavedOpportunity).toHaveBeenCalledWith('token-123', 'member-1', 'opp-1');
    expect(getApi().isSaved('opp-1')).toBe(false);
  });

  it('updates tracking status, favorite, and notes on a saved opportunity', async () => {
    const updated = { ...savedRecord, trackingStatus: 'APPLYING' as const, isFavorite: true, notes: 'Applied via referral' };
    mockedSaved.updateSavedOpportunity.mockResolvedValue(updated);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().updateSaved('opp-1', { trackingStatus: 'APPLYING', isFavorite: true, notes: 'Applied via referral' });
    });

    expect(mockedSaved.updateSavedOpportunity).toHaveBeenCalledWith('token-123', 'member-1', 'opp-1', {
      trackingStatus: 'APPLYING',
      isFavorite: true,
      notes: 'Applied via referral',
    });
    expect(getApi().state.savedByOpportunityId['opp-1']).toEqual(updated);
  });

  it('loads the next page and appends results without discarding what is already shown', async () => {
    const opportunity2 = { ...opportunity, id: 'opp-2', title: 'Second Grant' };
    mockedOpportunities.listOpportunities
      .mockResolvedValueOnce({ data: [opportunity], total: 2, page: 1, limit: 1, totalPages: 2 })
      .mockResolvedValueOnce({ data: [opportunity2], total: 2, page: 2, limit: 1, totalPages: 2 });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().search({ q: 'grant' });
    });
    await act(async () => {
      await getApi().loadMore();
    });

    expect(mockedOpportunities.listOpportunities).toHaveBeenLastCalledWith('token-123', { q: 'grant', page: 2 });
    expect(getApi().state.results).toEqual([opportunity, opportunity2]);
    expect(getApi().state.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
  });

  it('does not request another page once every page has been loaded', async () => {
    mockedOpportunities.listOpportunities.mockResolvedValue({ data: [opportunity], total: 1, page: 1, limit: 20, totalPages: 1 });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().search({});
    });
    await act(async () => {
      await getApi().loadMore();
    });

    expect(mockedOpportunities.listOpportunities).toHaveBeenCalledTimes(1);
  });
});
