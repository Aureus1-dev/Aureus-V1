import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { AnnouncementsProvider } from '../../../state/announcements/AnnouncementsContext';
import { AnnouncementsComposerPanel } from './AnnouncementsComposerPanel';
import * as announcementsApi from '../../../lib/api/announcements';
import type { AnnouncementDto } from '../../../lib/api/announcements';

jest.mock('../../../lib/api/announcements');

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

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'admin-1', email: 'admin@example.com' });
  }
  return <>{children}</>;
}

function renderPanel() {
  return render(
    <SessionProvider>
      <AnnouncementsProvider>
        <SignedInAs>
          <AnnouncementsComposerPanel />
        </SignedInAs>
      </AnnouncementsProvider>
    </SessionProvider>,
  );
}

describe('AnnouncementsComposerPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists an existing announcement with its status', async () => {
    mockedApi.listAnnouncements.mockResolvedValue({ data: [makeAnnouncement()], total: 1, page: 1, limit: 20, totalPages: 1 });
    renderPanel();

    expect(await screen.findByText('Platform maintenance')).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('creates a new draft announcement', async () => {
    mockedApi.listAnnouncements.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedApi.createAnnouncement.mockResolvedValue(makeAnnouncement({ id: 'a-2', title: 'New notice', body: 'Body text' }));
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText('No announcements yet');

    await user.type(screen.getByLabelText(/Title/), 'New notice');
    await user.type(screen.getByLabelText(/Body/), 'Body text');
    await user.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() =>
      expect(mockedApi.createAnnouncement).toHaveBeenCalledWith('token-123', {
        title: 'New notice', body: 'Body text', scope: 'PLATFORM', isCritical: false,
        targetRole: undefined, organizationId: undefined, stewardId: undefined,
      }),
    );
    expect(await screen.findByText('New notice')).toBeInTheDocument();
  });

  it('shows the target-role field only when scope is ROLE', async () => {
    mockedApi.listAnnouncements.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText('No announcements yet');

    expect(screen.queryByText('Target role')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Scope'), 'ROLE');
    expect(screen.getByText('Target role')).toBeInTheDocument();
  });

  it('publishes a draft announcement', async () => {
    mockedApi.listAnnouncements.mockResolvedValue({ data: [makeAnnouncement()], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedApi.publishAnnouncement.mockResolvedValue(makeAnnouncement({ status: 'PUBLISHED', publishedAt: NOW }));
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText('Platform maintenance');
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(mockedApi.publishAnnouncement).toHaveBeenCalledWith('token-123', 'a-1'));
    expect(await screen.findByText('PUBLISHED')).toBeInTheDocument();
  });

  it('archives an announcement', async () => {
    mockedApi.listAnnouncements.mockResolvedValue({
      data: [makeAnnouncement({ status: 'PUBLISHED', publishedAt: NOW })], total: 1, page: 1, limit: 20, totalPages: 1,
    });
    mockedApi.archiveAnnouncement.mockResolvedValue(makeAnnouncement({ status: 'ARCHIVED', archivedAt: NOW }));
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText('Platform maintenance');
    await user.click(screen.getByRole('button', { name: 'Archive' }));

    await waitFor(() => expect(mockedApi.archiveAnnouncement).toHaveBeenCalledWith('token-123', 'a-1'));
    expect(await screen.findByText('ARCHIVED')).toBeInTheDocument();
  });

  it('has no accessibility violations with a populated list', async () => {
    mockedApi.listAnnouncements.mockResolvedValue({ data: [makeAnnouncement()], total: 1, page: 1, limit: 20, totalPages: 1 });
    const { container } = renderPanel();
    await screen.findByText('Platform maintenance');
    expect(await axe(container)).toHaveNoViolations();
  });
});
