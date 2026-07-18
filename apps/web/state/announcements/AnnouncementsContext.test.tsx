import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { AnnouncementsProvider, useAnnouncements } from './AnnouncementsContext';
import * as announcementsApi from '../../lib/api/announcements';
import { ApiError } from '../../lib/api/errors';
import type { AnnouncementDto } from '../../lib/api/announcements';

jest.mock('../../lib/api/announcements');

const mockedApi = announcementsApi as jest.Mocked<typeof announcementsApi>;

const NOW = '2026-01-01T00:00:00Z';

function makeAnnouncement(o: Partial<AnnouncementDto> = {}): AnnouncementDto {
  return {
    id: 'a-1', title: 'Platform maintenance', body: 'We will be performing maintenance.', scope: 'PLATFORM',
    organizationId: null, targetRole: null, stewardId: null, status: 'DRAFT', isCritical: false,
    scheduledFor: null, publishedAt: null, expiresAt: null, archivedAt: null, authorId: 'admin-1',
    createdAt: NOW, updatedAt: NOW, ...o,
  };
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useAnnouncements> & { setToken: (t: string | null) => void }) => void }) {
  const announcements = useAnnouncements();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...announcements,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'admin-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useAnnouncements> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <AnnouncementsProvider>
        <Harness onReady={(value) => (api = value)} />
      </AnnouncementsProvider>
    </SessionProvider>,
  );
  return () => api;
}

describe('AnnouncementsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads announcements', async () => {
    mockedApi.listAnnouncements.mockResolvedValue({ data: [makeAnnouncement()], total: 1, page: 1, limit: 20, totalPages: 1 });
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    expect(getApi().state.announcements).toHaveLength(1);
    expect(getApi().state.total).toBe(1);
  });

  it('creates a new announcement and prepends it to the list', async () => {
    mockedApi.createAnnouncement.mockResolvedValue(makeAnnouncement({ id: 'a-2', title: 'New notice' }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().create({ title: 'New notice', body: 'Body', scope: 'PLATFORM' }));

    expect(mockedApi.createAnnouncement).toHaveBeenCalledWith('token-123', { title: 'New notice', body: 'Body', scope: 'PLATFORM' });
    expect(getApi().state.announcements[0].title).toBe('New notice');
    expect(getApi().state.total).toBe(1);
  });

  it('publishes an announcement, updating its status in place', async () => {
    mockedApi.listAnnouncements.mockResolvedValue({ data: [makeAnnouncement()], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedApi.publishAnnouncement.mockResolvedValue(makeAnnouncement({ status: 'PUBLISHED', publishedAt: NOW }));

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());
    await act(async () => getApi().publish('a-1'));

    expect(mockedApi.publishAnnouncement).toHaveBeenCalledWith('token-123', 'a-1');
    expect(getApi().state.announcements[0].status).toBe('PUBLISHED');
  });

  it('archives an announcement, updating its status in place', async () => {
    mockedApi.listAnnouncements.mockResolvedValue({
      data: [makeAnnouncement({ status: 'PUBLISHED' })], total: 1, page: 1, limit: 20, totalPages: 1,
    });
    mockedApi.archiveAnnouncement.mockResolvedValue(makeAnnouncement({ status: 'ARCHIVED', archivedAt: NOW }));

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());
    await act(async () => getApi().archive('a-1'));

    expect(mockedApi.archiveAnnouncement).toHaveBeenCalledWith('token-123', 'a-1');
    expect(getApi().state.announcements[0].status).toBe('ARCHIVED');
  });

  it('requires authentication before loading and never calls the API unauthenticated', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().load());
    expect(mockedApi.listAnnouncements).not.toHaveBeenCalled();
  });

  it('classifies a 403 as an authorization error distinct from authentication, and clears it on request', async () => {
    mockedApi.listAnnouncements.mockRejectedValue(new ApiError(403, 'Founder access required'));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    expect(getApi().state.error?.kind).toBe('authorization');
    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });
});
