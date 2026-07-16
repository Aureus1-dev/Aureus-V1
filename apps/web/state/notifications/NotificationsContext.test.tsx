import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { NotificationsProvider, useNotifications } from './NotificationsContext';
import * as notificationsApi from '../../lib/api/notifications';
import { ApiError } from '../../lib/api/errors';
import type { NotificationDto } from '../../lib/api/notifications';

jest.mock('../../lib/api/notifications');

const mockedApi = notificationsApi as jest.Mocked<typeof notificationsApi>;

const NOW = '2026-01-01T00:00:00Z';

function makeNotification(o: Partial<NotificationDto>): NotificationDto {
  return {
    id: 'n-1', recipientId: 'user-1', category: 'JOURNEY', type: 'journey.updated', title: 'Title', body: 'Body',
    data: null, actorId: null, readAt: null, archivedAt: null, expiresAt: null, createdAt: NOW, ...o,
  };
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useNotifications> & { setToken: (t: string | null) => void }) => void }) {
  const notifications = useNotifications();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...notifications,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'member-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useNotifications> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <NotificationsProvider>
        <Harness onReady={(value) => (api = value)} />
      </NotificationsProvider>
    </SessionProvider>,
  );
  return () => api;
}

describe('NotificationsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads a list of notifications', async () => {
    mockedApi.listNotifications.mockResolvedValue({
      data: [makeNotification({ id: 'n-1' }), makeNotification({ id: 'n-2' })], total: 2, page: 1, limit: 10, totalPages: 1,
    });
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load({ limit: 10 }));

    expect(mockedApi.listNotifications).toHaveBeenCalledWith('token-123', { limit: 10 });
    expect(getApi().state.notifications).toHaveLength(2);
  });

  it('loads the unread count independent of the loaded list', async () => {
    mockedApi.listNotifications.mockResolvedValue({ data: [], total: 4, page: 1, limit: 1, totalPages: 4 });
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadUnreadCount());

    expect(mockedApi.listNotifications).toHaveBeenCalledWith('token-123', { unreadOnly: true, limit: 1 });
    expect(getApi().state.unreadCount).toBe(4);
  });

  it('marking one notification read updates that entry and decrements the unread count', async () => {
    mockedApi.listNotifications
      .mockResolvedValueOnce({ data: [makeNotification({ id: 'n-1', readAt: null })], total: 1, page: 1, limit: 10, totalPages: 1 })
      .mockResolvedValueOnce({ data: [], total: 3, page: 1, limit: 1, totalPages: 3 });
    mockedApi.markNotificationRead.mockResolvedValue(makeNotification({ id: 'n-1', readAt: '2026-01-02T00:00:00Z' }));

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());
    await act(async () => getApi().loadUnreadCount());
    await act(async () => getApi().markRead('n-1'));

    expect(mockedApi.markNotificationRead).toHaveBeenCalledWith('token-123', 'n-1');
    expect(getApi().state.notifications[0].readAt).toBe('2026-01-02T00:00:00Z');
    expect(getApi().state.unreadCount).toBe(2);
  });

  it('marking all read flips every unread entry locally and zeroes the count', async () => {
    mockedApi.listNotifications.mockResolvedValue({
      data: [makeNotification({ id: 'n-1', readAt: null }), makeNotification({ id: 'n-2', readAt: '2025-12-31T00:00:00Z' })],
      total: 2, page: 1, limit: 10, totalPages: 1,
    });
    mockedApi.markAllNotificationsRead.mockResolvedValue({ count: 1 });

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());
    await act(async () => getApi().markAllRead());

    expect(getApi().state.notifications.every((n) => n.readAt !== null)).toBe(true);
    expect(getApi().state.unreadCount).toBe(0);
  });

  it('requires authentication before loading and never calls the API unauthenticated', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().load());
    expect(mockedApi.listNotifications).not.toHaveBeenCalled();
  });

  it('classifies an authentication error distinctly and clears it on request', async () => {
    mockedApi.listNotifications.mockRejectedValue(new ApiError(401, 'Sign in required'));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    expect(getApi().state.error?.kind).toBe('authentication');
    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });
});
