import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { MemoryProvider, useMemory } from './MemoryContext';
import * as memoryApi from '../../lib/api/memory';
import { ApiError } from '../../lib/api/errors';

jest.mock('../../lib/api/memory');

const mockedApi = memoryApi as jest.Mocked<typeof memoryApi>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useMemory> & { setToken: (t: string) => void }) => void }) {
  const memory = useMemory();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...memory,
      setToken: (token: string) => setSession({ ...session, isAuthenticated: true, accessToken: token, memberId: 'member-1' }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useMemory> & { setToken: (t: string) => void };
  render(
    <SessionProvider>
      <MemoryProvider>
        <Harness onReady={(value) => (api = value)} />
      </MemoryProvider>
    </SessionProvider>,
  );
  return () => api;
}

const memory: memoryApi.InstitutionalMemoryDto = {
  goals: [{ id: 'goal-1', title: 'Find a better job', status: 'ACTIVE' }],
  activeJourney: { id: 'journey-1', goalId: 'goal-1', title: 'Find a better job', completedMilestones: 1, totalMilestones: 3 },
  savedOpportunities: [{ id: 'opp-1', title: 'Career Training Grant' }],
  savedResources: [],
  podMemberships: [],
  stewardshipRelationship: null,
  recentConversationSnippets: ['I need help finding a job.'],
};

describe('MemoryContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads the caller's own institutional memory", async () => {
    mockedApi.getMyMemory.mockResolvedValue(memory);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().loadMemory();
    });

    expect(mockedApi.getMyMemory).toHaveBeenCalledWith('token-123');
    expect(getApi().state.memory).toEqual(memory);
    expect(getApi().state.isLoading).toBe(false);
  });

  it('does not allow overlapping load calls', async () => {
    let resolveLoad!: (value: memoryApi.InstitutionalMemoryDto) => void;
    mockedApi.getMyMemory.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
    );

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));

    let first!: Promise<void>;
    act(() => {
      first = getApi().loadMemory();
    });
    await act(async () => {
      await getApi().loadMemory();
    });

    expect(mockedApi.getMyMemory).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLoad(memory);
      await first;
    });
  });

  it('classifies a 503 as retryable', async () => {
    mockedApi.getMyMemory.mockRejectedValue(new ApiError(503, 'The service is temporarily unavailable'));

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().loadMemory();
    });

    expect(getApi().state.error).toEqual({
      kind: 'unavailable',
      message: 'The service is temporarily unavailable',
      retryable: true,
    });
  });

  it('clears an error', async () => {
    mockedApi.getMyMemory.mockRejectedValue(new ApiError(503, 'The service is temporarily unavailable'));

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().loadMemory();
    });
    expect(getApi().state.error).not.toBeNull();

    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });
});
