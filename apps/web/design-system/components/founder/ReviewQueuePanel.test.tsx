import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { ReviewQueueProvider } from '../../../state/review-queue/ReviewQueueContext';
import { ReviewQueuePanel } from './ReviewQueuePanel';
import * as reviewQueueApi from '../../../lib/api/review-queue';

jest.mock('../../../lib/api/review-queue');

const mockedApi = reviewQueueApi as jest.Mocked<typeof reviewQueueApi>;

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
      <ReviewQueueProvider>
        <SignedInAs>
          <ReviewQueuePanel />
        </SignedInAs>
      </ReviewQueueProvider>
    </SessionProvider>,
  );
}

function mockOneItemPerDomainExcept(present: Parameters<typeof reviewQueueApi.listPendingReview>[1]) {
  mockedApi.listPendingReview.mockImplementation(async (_token, domain) => {
    if (domain === present) {
      return { items: [{ id: `${domain}-1`, domain, title: 'A Community Resource', createdAt: '2026-01-01T00:00:00Z' }], total: 1 };
    }
    return { items: [], total: 0 };
  });
}

describe('ReviewQueuePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an empty state when nothing is pending', async () => {
    mockedApi.listPendingReview.mockResolvedValue({ items: [], total: 0 });
    renderPanel();
    expect(await screen.findByText('Nothing pending')).toBeInTheDocument();
  });

  it('lists a pending item with its domain label', async () => {
    mockOneItemPerDomainExcept('resources');
    renderPanel();
    expect(await screen.findByText('A Community Resource')).toBeInTheDocument();
    expect(screen.getByText('Resource')).toBeInTheDocument();
  });

  it('verifies an item and removes it from the list', async () => {
    mockOneItemPerDomainExcept('organizations');
    mockedApi.verifyPendingReview.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText('A Community Resource');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(mockedApi.verifyPendingReview).toHaveBeenCalledWith('token-123', 'organizations', 'organizations-1', 'admin-1'),
    );
    await waitFor(() => expect(screen.queryByText('A Community Resource')).not.toBeInTheDocument());
  });

  it('requires a rejection reason of at least 10 characters before confirming', async () => {
    mockOneItemPerDomainExcept('knowledge');
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText('A Community Resource');
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    const confirmButton = screen.getByRole('button', { name: 'Confirm rejection' });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText('Rejection reason'), 'Too vague to verify');
    expect(confirmButton).not.toBeDisabled();

    mockedApi.rejectPendingReview.mockResolvedValue(undefined);
    await user.click(confirmButton);

    await waitFor(() =>
      expect(mockedApi.rejectPendingReview).toHaveBeenCalledWith(
        'token-123', 'knowledge', 'knowledge-1', 'Too vague to verify', 'admin-1',
      ),
    );
  });

  it('has no accessibility violations with a populated queue', async () => {
    mockOneItemPerDomainExcept('academy');
    const { container } = renderPanel();
    await screen.findByText('A Community Resource');
    expect(await axe(container)).toHaveNoViolations();
  });
});
