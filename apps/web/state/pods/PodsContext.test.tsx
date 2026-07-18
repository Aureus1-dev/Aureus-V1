import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { PodsProvider, usePods } from './PodsContext';
import * as podsApi from '../../lib/api/pods';
import { ApiError } from '../../lib/api/errors';
import type { PodDto, MembershipDto, RequestDto, InvitationDto } from '../../lib/api/pods';

jest.mock('../../lib/api/pods');

const mockedApi = podsApi as jest.Mocked<typeof podsApi>;

function makePod(o: Partial<PodDto> = {}): PodDto {
  return {
    id: 'pod-1', podRef: 'AUR-POD-000001', name: 'Book Club', shortDescription: 'Readers unite',
    fullDescription: 'A Pod for people who love books.', type: 'INTEREST', status: 'ACTIVE', capacity: 20,
    primaryLanguage: null, city: null, region: null, stateProvince: null, country: null,
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

function makeRequest(o: Partial<RequestDto> = {}): RequestDto {
  return {
    id: 'req-1', userId: 'member-1', type: 'JOIN', podId: 'pod-1', proposedPodName: null,
    proposedPodDescription: null, reason: null, status: 'PENDING', decidedById: null, decidedAt: null,
    createdAt: '2026-01-01T00:00:00Z', ...o,
  };
}

function makeInvitation(o: Partial<InvitationDto> = {}): InvitationDto {
  return {
    id: 'inv-1', podId: 'pod-1', invitedUserId: 'member-1', invitedById: 'steward-1', message: null,
    status: 'PENDING', respondedAt: null, createdAt: '2026-01-01T00:00:00Z', ...o,
  };
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof usePods> & { setToken: (t: string | null) => void }) => void }) {
  const pods = usePods();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...pods,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'member-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pods, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof usePods> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <PodsProvider>
        <Harness onReady={(value) => (api = value)} />
      </PodsProvider>
    </SessionProvider>,
  );
  return () => api;
}

describe('PodsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches Pods', async () => {
    mockedApi.listPods.mockResolvedValue({ data: [makePod()], total: 1, page: 1, limit: 20, totalPages: 1 });
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().search({ q: 'book' }));

    expect(mockedApi.listPods).toHaveBeenCalledWith('token-123', { q: 'book' });
    expect(getApi().state.results).toHaveLength(1);
  });

  it('loads memberships, requests, and invitations, and resolves referenced Pods', async () => {
    mockedApi.listMyMemberships.mockResolvedValue([makeMembership()]);
    mockedApi.listMyPodRequests.mockResolvedValue([makeRequest()]);
    mockedApi.listMyInvitations.mockResolvedValue([makeInvitation()]);
    mockedApi.getPod.mockResolvedValue(makePod());

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadMine());

    expect(getApi().state.memberships).toHaveLength(1);
    expect(getApi().state.requests).toHaveLength(1);
    expect(getApi().state.invitations).toHaveLength(1);
    expect(getApi().state.podsById['pod-1'].name).toBe('Book Club');
    expect(mockedApi.getPod).toHaveBeenCalledTimes(1);
  });

  it('responds to an invitation', async () => {
    mockedApi.respondToInvitation.mockResolvedValue(makeInvitation({ status: 'ACCEPTED' }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    await act(async () => getApi().respondToInvitation('inv-1', 'ACCEPT'));

    expect(mockedApi.respondToInvitation).toHaveBeenCalledWith('token-123', 'inv-1', 'ACCEPT');
  });

  it('responds to a proactive membership suggestion', async () => {
    mockedApi.respondToMembership.mockResolvedValue(makeMembership({ status: 'ACTIVE' }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    await act(async () => getApi().respondToMembership('ms-1', 'ACCEPT'));

    expect(mockedApi.respondToMembership).toHaveBeenCalledWith('token-123', 'ms-1', 'ACCEPT');
  });

  it('leaves a Pod', async () => {
    mockedApi.leaveMembership.mockResolvedValue(makeMembership({ status: 'ENDED' }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    await act(async () => getApi().leavePod('ms-1'));

    expect(mockedApi.leaveMembership).toHaveBeenCalledWith('token-123', 'ms-1');
  });

  it('requests to join a Pod', async () => {
    mockedApi.createPodRequest.mockResolvedValue(makeRequest());
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    await act(async () => getApi().requestToJoin('pod-1', 'I love reading'));

    expect(mockedApi.createPodRequest).toHaveBeenCalledWith('token-123', { type: 'JOIN', podId: 'pod-1', reason: 'I love reading' });
    expect(getApi().state.requests).toHaveLength(1);
  });

  it('proposes a new Pod', async () => {
    mockedApi.createPodRequest.mockResolvedValue(makeRequest({ type: 'PROPOSE_NEW_POD', podId: null }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    await act(async () => getApi().proposeNewPod('Chess Club', 'For chess lovers'));

    expect(mockedApi.createPodRequest).toHaveBeenCalledWith('token-123', {
      type: 'PROPOSE_NEW_POD', proposedPodName: 'Chess Club', proposedPodDescription: 'For chess lovers', reason: undefined,
    });
  });

  it('withdraws a request', async () => {
    mockedApi.withdrawPodRequest.mockResolvedValue(makeRequest({ status: 'WITHDRAWN' }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    await act(async () => getApi().withdrawRequest('req-1'));

    expect(mockedApi.withdrawPodRequest).toHaveBeenCalledWith('token-123', 'req-1');
  });

  it('classifies an error and clears it on request', async () => {
    mockedApi.listPods.mockRejectedValue(new ApiError(401, 'Sign in required'));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().search());

    expect(getApi().state.error?.kind).toBe('authentication');
    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });

  it('requires authentication before searching or loading', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().search());
    await act(async () => getApi().loadMine());
    expect(mockedApi.listPods).not.toHaveBeenCalled();
    expect(mockedApi.listMyMemberships).not.toHaveBeenCalled();
  });
});
