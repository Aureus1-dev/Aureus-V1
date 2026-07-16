import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { RecommendationsProvider, useRecommendations } from './RecommendationsContext';
import * as recommendationsApi from '../../lib/api/recommendations';
import { ApiError } from '../../lib/api/errors';

jest.mock('../../lib/api/recommendations');

const mockedApi = recommendationsApi as jest.Mocked<typeof recommendationsApi>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useRecommendations> & { setToken: (t: string) => void }) => void }) {
  const recommendations = useRecommendations();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...recommendations,
      setToken: (token: string) => setSession({ ...session, isAuthenticated: true, accessToken: token, memberId: 'member-1' }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useRecommendations> & { setToken: (t: string) => void };
  render(
    <SessionProvider>
      <RecommendationsProvider>
        <Harness onReady={(value) => (api = value)} />
      </RecommendationsProvider>
    </SessionProvider>,
  );
  return () => api;
}

const recommendation = {
  id: 'rec-1', userId: 'member-1', opportunityId: 'opp-1', resourceId: null, courseId: null, podId: null,
  rationale: 'This matches your goal.', status: 'PENDING' as const, decidedAt: null, createdAt: 'x',
};

describe('RecommendationsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates up to 3 recommendations for a category', async () => {
    mockedApi.generateRecommendations.mockResolvedValue([recommendation]);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().generate('OPPORTUNITY');
    });

    expect(mockedApi.generateRecommendations).toHaveBeenCalledWith('token-123', 'OPPORTUNITY');
    expect(getApi().state.recommendations).toEqual([recommendation]);
  });

  it('does not allow overlapping generate calls', async () => {
    let resolveGenerate!: (value: recommendationsApi.RecommendationDto[]) => void;
    mockedApi.generateRecommendations.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGenerate = resolve;
        }),
    );

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));

    let first!: Promise<void>;
    act(() => {
      first = getApi().generate('OPPORTUNITY');
    });
    await act(async () => {
      await getApi().generate('OPPORTUNITY');
    });

    expect(mockedApi.generateRecommendations).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveGenerate([recommendation]);
      await first;
    });
  });

  it('approves a recommendation and tracks the deciding state only while in flight', async () => {
    const approved = { ...recommendation, status: 'ACCEPTED' as const, decidedAt: 'x' };
    let resolveApprove!: (value: recommendationsApi.RecommendationDto) => void;
    mockedApi.approveRecommendation.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveApprove = resolve;
        }),
    );

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));

    let approvePromise!: Promise<void>;
    act(() => {
      approvePromise = getApi().approve('rec-1');
    });
    expect(getApi().isDeciding('rec-1')).toBe(true);

    await act(async () => {
      resolveApprove(approved);
      await approvePromise;
    });

    expect(getApi().isDeciding('rec-1')).toBe(false);
    expect(mockedApi.approveRecommendation).toHaveBeenCalledWith('token-123', 'rec-1');
  });

  it('dismisses a recommendation', async () => {
    const dismissed = { ...recommendation, status: 'DISMISSED' as const, decidedAt: 'x' };
    mockedApi.dismissRecommendation.mockResolvedValue(dismissed);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().dismiss('rec-1');
    });

    expect(mockedApi.dismissRecommendation).toHaveBeenCalledWith('token-123', 'rec-1');
  });

  it('classifies a 503 as retryable', async () => {
    mockedApi.generateRecommendations.mockRejectedValue(new ApiError(503, 'The AI service is temporarily unavailable'));

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().generate('OPPORTUNITY');
    });

    expect(getApi().state.error).toEqual({
      kind: 'unavailable',
      message: 'The AI service is temporarily unavailable',
      retryable: true,
    });
  });
});
