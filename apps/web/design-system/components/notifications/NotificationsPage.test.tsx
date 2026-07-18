import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { NotificationsProvider } from '../../../state/notifications/NotificationsContext';
import { NotificationsPage } from './NotificationsPage';
import * as notificationsApi from '../../../lib/api/notifications';
import type { NotificationDto } from '../../../lib/api/notifications';

jest.mock('../../../lib/api/notifications');

const mockedApi = notificationsApi as jest.Mocked<typeof notificationsApi>;

function makeNotification(o: Partial<NotificationDto>): NotificationDto {
  return {
    id: 'n-1', recipientId: 'member-1', category: 'JOURNEY', type: 'journey.updated', title: 'Milestone completed',
    body: 'You finished a milestone.', data: null, actorId: null, readAt: null, archivedAt: null,
    expiresAt: null, createdAt: '2026-01-01T00:00:00Z', ...o,
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
      <NotificationsProvider>
        <SignedInAs>
          <NotificationsPage />
        </SignedInAs>
      </NotificationsProvider>
    </SessionProvider>,
  );
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the loaded list of notifications', async () => {
    mockedApi.listNotifications.mockResolvedValue({
      data: [
        makeNotification({ id: 'n-1', title: 'Milestone completed' }),
        makeNotification({ id: 'n-2', title: 'Pod invitation received', readAt: '2026-01-02T00:00:00Z' }),
      ],
      total: 2, page: 1, limit: 20, totalPages: 1,
    });

    renderPage();

    expect(await screen.findByText('Milestone completed')).toBeInTheDocument();
    expect(screen.getByText('Pod invitation received')).toBeInTheDocument();
  });

  it('shows an empty state when there are no notifications', async () => {
    mockedApi.listNotifications.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    renderPage();

    expect(await screen.findByText('No notifications yet')).toBeInTheDocument();
  });

  it('marks a single notification read', async () => {
    mockedApi.listNotifications.mockResolvedValue({
      data: [makeNotification({ id: 'n-1' })], total: 1, page: 1, limit: 20, totalPages: 1,
    });
    mockedApi.markNotificationRead.mockResolvedValue(makeNotification({ id: 'n-1', readAt: '2026-01-02T00:00:00Z' }));

    renderPage();
    await screen.findByText('Milestone completed');

    await userEvent.click(screen.getByRole('button', { name: /mark read/i }));

    await waitFor(() => expect(mockedApi.markNotificationRead).toHaveBeenCalledWith('token-123', 'n-1'));
  });

  it('marks all notifications read', async () => {
    mockedApi.listNotifications.mockResolvedValue({
      data: [makeNotification({ id: 'n-1' })], total: 1, page: 1, limit: 20, totalPages: 1,
    });
    mockedApi.markAllNotificationsRead.mockResolvedValue({ count: 1 });

    renderPage();
    await screen.findByText('Milestone completed');
    await waitFor(() => expect(screen.getByRole('button', { name: /mark all as read/i })).not.toBeDisabled());

    await userEvent.click(screen.getByRole('button', { name: /mark all as read/i }));

    await waitFor(() => expect(mockedApi.markAllNotificationsRead).toHaveBeenCalledWith('token-123'));
  });

  it('filters to unread only', async () => {
    mockedApi.listNotifications.mockResolvedValue({
      data: [makeNotification({ id: 'n-1' })], total: 1, page: 1, limit: 20, totalPages: 1,
    });

    renderPage();
    await screen.findByText('Milestone completed');

    await userEvent.click(screen.getByRole('tab', { name: /unread/i }));

    await waitFor(() =>
      expect(mockedApi.listNotifications).toHaveBeenCalledWith('token-123', { limit: 20, unreadOnly: true }),
    );
  });

  it('shows a sign-in prompt when unauthenticated', () => {
    render(
      <SessionProvider>
        <NotificationsProvider>
          <NotificationsPage />
        </NotificationsProvider>
      </SessionProvider>,
    );

    expect(screen.getByText('Sign in to view your notifications')).toBeInTheDocument();
    expect(mockedApi.listNotifications).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    mockedApi.listNotifications.mockResolvedValue({
      data: [makeNotification({ id: 'n-1' })], total: 1, page: 1, limit: 20, totalPages: 1,
    });

    const { container } = renderPage();
    await screen.findByText('Milestone completed');

    expect(await axe(container)).toHaveNoViolations();
  });
});
