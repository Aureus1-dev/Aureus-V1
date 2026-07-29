import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { PlanProvider, usePlan } from './PlanContext';
import * as planApi from '../../lib/api/plan';
import { ApiError } from '../../lib/api/errors';

jest.mock('../../lib/api/plan');

const mockedApi = planApi as jest.Mocked<typeof planApi>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof usePlan> & { setToken: (t: string) => void }) => void }) {
  const plan = usePlan();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...plan,
      setToken: (token: string) => setSession({ ...session, isAuthenticated: true, accessToken: token, memberId: 'member-1' }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof usePlan> & { setToken: (t: string) => void };
  render(
    <SessionProvider>
      <PlanProvider>
        <Harness onReady={(value) => (api = value)} />
      </PlanProvider>
    </SessionProvider>,
  );
  return () => api;
}

const recommendation = {
  id: 'rec-1', userId: 'member-1', opportunityId: 'opp-1', resourceId: null, courseId: null, podId: null,
  rationale: 'This matches your goal.', status: 'PENDING' as const, decidedAt: null, createdAt: 'x',
};

const plan: planApi.CoordinatedPlanDto = {
  primary: { source: 'RECOMMENDATION', recommendation, cityResource: null, categoryLabel: 'Opportunity' },
  supporting: [],
  combinedRationale: 'Opportunity is the strongest real option available right now.',
  additionalPossibilitiesCount: 0,
};

const run: planApi.OrchestrationRunDto = {
  id: 'run-1', userId: 'member-1', goal: 'COORDINATED_PLAN', capabilitiesInvoked: ['RECOMMENDATION'],
  outcome: 'Built a coordinated plan.', status: 'SUCCESS', latencyMs: 42, createdAt: 'x',
};

describe('PlanContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a coordinated plan, optionally grounded in a stated need', async () => {
    mockedApi.buildCoordinatedPlan.mockResolvedValue({ run, plan });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().buildPlan('need-1');
    });

    expect(mockedApi.buildCoordinatedPlan).toHaveBeenCalledWith('token-123', 'need-1');
    expect(getApi().state.plan).toEqual(plan);
    expect(getApi().state.isBuilding).toBe(false);
  });

  it('builds a plan with no stated need', async () => {
    mockedApi.buildCoordinatedPlan.mockResolvedValue({ run, plan });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().buildPlan();
    });

    expect(mockedApi.buildCoordinatedPlan).toHaveBeenCalledWith('token-123', undefined);
  });

  it('does not allow overlapping build calls', async () => {
    let resolveBuild!: (value: planApi.OrchestrateResponseDto) => void;
    mockedApi.buildCoordinatedPlan.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBuild = resolve;
        }),
    );

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));

    let first!: Promise<void>;
    act(() => {
      first = getApi().buildPlan();
    });
    await act(async () => {
      await getApi().buildPlan();
    });

    expect(mockedApi.buildCoordinatedPlan).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveBuild({ run, plan });
      await first;
    });
  });

  it('leaves the plan null on a NO_ACTION run rather than surfacing it as an error', async () => {
    mockedApi.buildCoordinatedPlan.mockResolvedValue({ run: { ...run, status: 'NO_ACTION' } });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().buildPlan();
    });

    expect(getApi().state.plan).toBeNull();
    expect(getApi().state.error).toBeNull();
  });

  it('classifies a 503 as retryable', async () => {
    mockedApi.buildCoordinatedPlan.mockRejectedValue(new ApiError(503, 'The AI service is temporarily unavailable'));

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().buildPlan();
    });

    expect(getApi().state.error).toEqual({
      kind: 'unavailable',
      message: 'The AI service is temporarily unavailable',
      retryable: true,
    });
  });

  it('resets the plan and clears errors', async () => {
    mockedApi.buildCoordinatedPlan.mockResolvedValue({ run, plan });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().buildPlan();
    });
    expect(getApi().state.plan).toEqual(plan);

    act(() => getApi().reset());
    expect(getApi().state.plan).toBeNull();
  });
});
