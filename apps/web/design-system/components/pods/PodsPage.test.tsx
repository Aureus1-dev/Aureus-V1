import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { PodsProvider } from '../../../state/pods/PodsContext';
import { PodsPage } from './PodsPage';
import * as podsApi from '../../../lib/api/pods';
import type { PodDto, MembershipDto, RequestDto, InvitationDto } from '../../../lib/api/pods';

jest.mock('../../../lib/api/pods');

const mockedApi = podsApi as jest.Mocked<typeof podsApi>;

function makePod(o: Partial<PodDto> = {}): PodDto {
  return {
    id: 'pod-1', podRef: 'AUR-POD-000001', name: 'Book Club', shortDescription: 'Readers unite',
    fullDescription: 'A Pod for people who love books.', type: 'INTEREST', status: 'ACTIVE', capacity: 20,
    primaryLanguage: null, city: 'Austin', region: null, stateProvince: null, country: 'United States',
    dormancyThresholdDays: 30, parentPodId: null, createdById: 'u-1',
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o,
  };
}

function makeMembership(o: Partial<MembershipDto> = {}): MembershipDto {
  return {
    id: 'ms-1', podId: 'pod-1', userId: 'member-1', role: 'MEMBER', status: 'ACTIVE', origin: 'MEMBER_REQUEST',
    invitedById: null, joinedAt: '2026-01-01T00:00:00Z', endedAt: null, endReason: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o,
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
      <PodsProvider>
        <SignedInAs>
          <PodsPage />
        </SignedInAs>
      </PodsProvider>
    </SessionProvider>,
  );
}

describe('PodsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.listMyMemberships.mockResolvedValue([]);
    mockedApi.listMyPodRequests.mockResolvedValue([]);
    mockedApi.listMyInvitations.mockResolvedValue([]);
  });

  it('renders search results on the Discover tab by default', async () => {
    mockedApi.listPods.mockResolvedValue({ data: [makePod()], total: 1, page: 1, limit: 20, totalPages: 1 });

    renderPage();

    expect(await screen.findByText('Book Club')).toBeInTheDocument();
    expect(screen.getByText('Austin, United States')).toBeInTheDocument();
  });

  it('requests to join a Pod', async () => {
    mockedApi.listPods.mockResolvedValue({ data: [makePod()], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedApi.createPodRequest.mockResolvedValue({
      id: 'req-1', userId: 'member-1', type: 'JOIN', podId: 'pod-1', proposedPodName: null,
      proposedPodDescription: null, reason: null, status: 'PENDING', decidedById: null, decidedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
    });

    renderPage();
    await screen.findByText('Book Club');

    await userEvent.click(screen.getByRole('button', { name: 'Request to join' }));

    await waitFor(() =>
      expect(mockedApi.createPodRequest).toHaveBeenCalledWith('token-123', { type: 'JOIN', podId: 'pod-1', reason: undefined }),
    );
  });

  it('switches to My Pods and shows an active membership', async () => {
    mockedApi.listPods.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedApi.listMyMemberships.mockResolvedValue([makeMembership()]);
    mockedApi.getPod.mockResolvedValue(makePod());

    renderPage();
    await screen.findByText('No Pods found');

    await userEvent.click(screen.getByRole('tab', { name: 'My Pods' }));

    expect(await screen.findByText('Book Club')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave Pod' })).toBeInTheDocument();
  });

  it('responds to a received invitation', async () => {
    mockedApi.listPods.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const invitation: InvitationDto = {
      id: 'inv-1', podId: 'pod-1', invitedUserId: 'member-1', invitedById: 'steward-1', message: 'Join us!',
      status: 'PENDING', respondedAt: null, createdAt: '2026-01-01T00:00:00Z',
    };
    mockedApi.listMyInvitations.mockResolvedValue([invitation]);
    mockedApi.getPod.mockResolvedValue(makePod());
    mockedApi.respondToInvitation.mockResolvedValue({ ...invitation, status: 'ACCEPTED' });

    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'My Pods' }));

    await screen.findByText('Join us!');
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(mockedApi.respondToInvitation).toHaveBeenCalledWith('token-123', 'inv-1', 'ACCEPT'));
  });

  it('withdraws a pending request', async () => {
    mockedApi.listPods.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const request: RequestDto = {
      id: 'req-1', userId: 'member-1', type: 'JOIN', podId: 'pod-1', proposedPodName: null,
      proposedPodDescription: null, reason: null, status: 'PENDING', decidedById: null, decidedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    mockedApi.listMyPodRequests.mockResolvedValue([request]);
    mockedApi.getPod.mockResolvedValue(makePod());
    mockedApi.withdrawPodRequest.mockResolvedValue({ ...request, status: 'WITHDRAWN' });

    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'My Pods' }));

    await screen.findByText('Join: Book Club');
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

    await waitFor(() => expect(mockedApi.withdrawPodRequest).toHaveBeenCalledWith('token-123', 'req-1'));
  });

  it('proposes a new Pod', async () => {
    mockedApi.listPods.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedApi.createPodRequest.mockResolvedValue({
      id: 'req-2', userId: 'member-1', type: 'PROPOSE_NEW_POD', podId: null, proposedPodName: 'Chess Club',
      proposedPodDescription: 'For chess lovers', reason: null, status: 'PENDING', decidedById: null,
      decidedAt: null, createdAt: '2026-01-01T00:00:00Z',
    });

    renderPage();
    await screen.findByText('No Pods found');

    await userEvent.click(screen.getByRole('button', { name: 'Propose a new Pod' }));
    await userEvent.type(screen.getByLabelText(/Pod name/), 'Chess Club');
    await userEvent.type(screen.getByLabelText('Description'), 'For chess lovers');
    await userEvent.click(screen.getByRole('button', { name: 'Submit proposal' }));

    await waitFor(() =>
      expect(mockedApi.createPodRequest).toHaveBeenCalledWith('token-123', {
        type: 'PROPOSE_NEW_POD', proposedPodName: 'Chess Club', proposedPodDescription: 'For chess lovers', reason: undefined,
      }),
    );
  });

  it('shows a sign-in prompt when unauthenticated', () => {
    render(
      <SessionProvider>
        <PodsProvider>
          <PodsPage />
        </PodsProvider>
      </SessionProvider>,
    );

    expect(screen.getByText('Sign in to view Pods')).toBeInTheDocument();
    expect(mockedApi.listPods).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    mockedApi.listPods.mockResolvedValue({ data: [makePod()], total: 1, page: 1, limit: 20, totalPages: 1 });
    const { container } = renderPage();
    await screen.findByText('Book Club');

    expect(await axe(container)).toHaveNoViolations();
  });
});
