import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { ReviewQueueProvider, useReviewQueue } from './ReviewQueueContext';
import * as reviewQueueApi from '../../lib/api/review-queue';
import { ApiError } from '../../lib/api/errors';

jest.mock('../../lib/api/review-queue');

const mockedApi = reviewQueueApi as jest.Mocked<typeof reviewQueueApi>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useReviewQueue> & { setToken: (t: string | null) => void }) => void }) {
  const reviewQueue = useReviewQueue();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...reviewQueue,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'admin-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewQueue, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useReviewQueue> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <ReviewQueueProvider>
        <Harness onReady={(value) => (api = value)} />
      </ReviewQueueProvider>
    </SessionProvider>,
  );
  return () => api;
}

function emptyResult() {
  return { items: [], total: 0 };
}

describe('ReviewQueueContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads pending items from every domain and flattens them into one list', async () => {
    mockedApi.listPendingReview.mockImplementation(async (_token, domain) => {
      if (domain === 'resources') {
        return { items: [{ id: 'r-1', domain: 'resources', title: 'Food pantry', createdAt: '2026-01-01T00:00:00Z' }], total: 1 };
      }
      if (domain === 'organizations') {
        return { items: [{ id: 'o-1', domain: 'organizations', title: 'Acme Nonprofit', createdAt: '2026-01-01T00:00:00Z' }], total: 1 };
      }
      return emptyResult();
    });

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    expect(mockedApi.listPendingReview).toHaveBeenCalledWith('token-123', 'resources');
    expect(mockedApi.listPendingReview).toHaveBeenCalledWith('token-123', 'academy');
    expect(getApi().state.items).toHaveLength(2);
  });

  it('verifying an item removes it from the list and passes the caller as reviewerId', async () => {
    mockedApi.listPendingReview.mockImplementation(async (_token, domain) =>
      domain === 'opportunities'
        ? { items: [{ id: 'op-1', domain: 'opportunities', title: 'Grant', createdAt: '2026-01-01T00:00:00Z' }], total: 1 }
        : emptyResult(),
    );
    mockedApi.verifyPendingReview.mockResolvedValue(undefined);

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());
    expect(getApi().state.items).toHaveLength(1);

    await act(async () => getApi().verify('opportunities', 'op-1'));

    expect(mockedApi.verifyPendingReview).toHaveBeenCalledWith('token-123', 'opportunities', 'op-1', 'admin-1');
    expect(getApi().state.items).toHaveLength(0);
  });

  it('rejecting an item removes it from the list and passes the reason through', async () => {
    mockedApi.listPendingReview.mockImplementation(async (_token, domain) =>
      domain === 'knowledge'
        ? { items: [{ id: 'k-1', domain: 'knowledge', title: 'Budgeting basics', createdAt: '2026-01-01T00:00:00Z' }], total: 1 }
        : emptyResult(),
    );
    mockedApi.rejectPendingReview.mockResolvedValue(undefined);

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    await act(async () => getApi().reject('knowledge', 'k-1', 'Needs a citation for the statistic on line 2.'));

    expect(mockedApi.rejectPendingReview).toHaveBeenCalledWith(
      'token-123', 'knowledge', 'k-1', 'Needs a citation for the statistic on line 2.', 'admin-1',
    );
    expect(getApi().state.items).toHaveLength(0);
  });

  it('requires authentication before loading and never calls the API unauthenticated', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().load());
    expect(mockedApi.listPendingReview).not.toHaveBeenCalled();
  });

  it('classifies a 403 as an authorization error distinct from authentication, and clears it on request', async () => {
    mockedApi.listPendingReview.mockRejectedValue(new ApiError(403, 'Founder access required'));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    expect(getApi().state.error?.kind).toBe('authorization');
    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });
});
