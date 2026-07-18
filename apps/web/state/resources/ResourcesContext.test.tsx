import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { ResourcesProvider, useResources } from './ResourcesContext';
import * as resourcesApi from '../../lib/api/resources';
import * as savedResourcesApi from '../../lib/api/saved-resources';
import { ApiError } from '../../lib/api/errors';
import type { ResourceDto } from '../../lib/api/resources';
import type { SavedResourceDto } from '../../lib/api/saved-resources';

jest.mock('../../lib/api/resources');
jest.mock('../../lib/api/saved-resources');

const mockedApi = resourcesApi as jest.Mocked<typeof resourcesApi>;
const mockedSavedApi = savedResourcesApi as jest.Mocked<typeof savedResourcesApi>;

function makeResource(o: Partial<ResourceDto> = {}): ResourceDto {
  return {
    id: 'res-1', resourceRef: 'AUR-RES-000001', title: 'Food Bank', shortDescription: 'Free groceries',
    fullDescription: 'A local food bank.', category: 'COMMUNITY_ORGANIZATION', resourceType: 'SERVICE', tags: [],
    organizationName: 'Central Food Bank', officialSourceUrl: 'https://example.com', contactName: null,
    contactEmail: null, contactPhone: null, location: null, country: null, state: null, city: null, isRemote: false,
    eligibilityNotes: null, status: 'ACTIVE', verificationStatus: 'VERIFIED', rejectionReason: null,
    confidenceScore: 90, freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'Admin',
    sourceUrl: null, sourceType: 'ADMIN_ENTRY', ownerId: 'u-1', submittedById: 'u-1', createdById: 'u-1',
    lastUpdatedById: 'u-1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null,
    ...o,
  };
}

function makeSaved(o: Partial<SavedResourceDto> = {}): SavedResourceDto {
  return {
    id: 'sv-1', userId: 'member-1', resourceId: 'res-1', isFavorite: false, notes: null,
    savedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o,
  };
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useResources> & { setToken: (t: string | null) => void }) => void }) {
  const resources = useResources();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...resources,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'member-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resources, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useResources> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <ResourcesProvider>
        <Harness onReady={(value) => (api = value)} />
      </ResourcesProvider>
    </SessionProvider>,
  );
  return () => api;
}

describe('ResourcesContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches resources', async () => {
    mockedApi.listResources.mockResolvedValue({ data: [makeResource()], total: 1, page: 1, limit: 20, totalPages: 1 });
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().search({ q: 'food' }));

    expect(mockedApi.listResources).toHaveBeenCalledWith('token-123', { q: 'food' });
    expect(getApi().state.results).toHaveLength(1);
  });

  it('loads more results and appends them', async () => {
    mockedApi.listResources
      .mockResolvedValueOnce({ data: [makeResource({ id: 'res-1' })], total: 2, page: 1, limit: 1, totalPages: 2 })
      .mockResolvedValueOnce({ data: [makeResource({ id: 'res-2' })], total: 2, page: 2, limit: 1, totalPages: 2 });
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().search({}));
    await act(async () => getApi().loadMore());

    expect(getApi().state.results).toHaveLength(2);
  });

  it('loads saved resources', async () => {
    mockedSavedApi.listSavedResources.mockResolvedValue([makeSaved()]);
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadSaved());

    expect(mockedSavedApi.listSavedResources).toHaveBeenCalledWith('token-123', 'member-1');
    expect(getApi().isSaved('res-1')).toBe(true);
  });

  it('toggles save and unsave', async () => {
    mockedSavedApi.saveResource.mockResolvedValue(makeSaved());
    mockedSavedApi.removeSavedResource.mockResolvedValue(undefined);
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    await act(async () => getApi().toggleSave('res-1'));
    expect(getApi().isSaved('res-1')).toBe(true);

    await act(async () => getApi().toggleSave('res-1'));
    expect(getApi().isSaved('res-1')).toBe(false);
  });

  it('updates a saved resource', async () => {
    mockedSavedApi.updateSavedResource.mockResolvedValue(makeSaved({ isFavorite: true, notes: 'Great place' }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    await act(async () => getApi().updateSaved('res-1', { isFavorite: true, notes: 'Great place' }));

    expect(mockedSavedApi.updateSavedResource).toHaveBeenCalledWith('token-123', 'member-1', 'res-1', {
      isFavorite: true, notes: 'Great place',
    });
  });

  it('classifies an error and clears it on request', async () => {
    mockedApi.listResources.mockRejectedValue(new ApiError(401, 'Sign in required'));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().search({}));

    expect(getApi().state.error?.kind).toBe('authentication');
    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });

  it('requires authentication before searching or loading saved', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().search({}));
    await act(async () => getApi().loadSaved());
    expect(mockedApi.listResources).not.toHaveBeenCalled();
    expect(mockedSavedApi.listSavedResources).not.toHaveBeenCalled();
  });
});
