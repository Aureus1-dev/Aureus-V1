import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { TasksProvider, useTasks } from './TasksContext';
import * as tasksApi from '../../lib/api/tasks';
import { ApiError } from '../../lib/api/errors';
import type { TaskDto } from '../../lib/api/tasks';

jest.mock('../../lib/api/tasks');

const mockedApi = tasksApi as jest.Mocked<typeof tasksApi>;

function makeTask(o: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 't-1', title: 'Take the first step', status: 'PENDING', priority: 'MEDIUM', position: 0,
    milestoneId: 'm-1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null, ...o,
  };
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useTasks> & { setToken: (t: string | null) => void }) => void }) {
  const tasks = useTasks();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...tasks,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'member-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useTasks> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <TasksProvider>
        <Harness onReady={(value) => (api = value)} />
      </TasksProvider>
    </SessionProvider>,
  );
  return () => api;
}

describe('TasksContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the caller\'s own tasks', async () => {
    mockedApi.listMyTasks.mockResolvedValue({
      data: [makeTask({ id: 't-1' }), makeTask({ id: 't-2' })], total: 2, page: 1, limit: 50, totalPages: 1,
    });
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    expect(mockedApi.listMyTasks).toHaveBeenCalledWith('token-123');
    expect(getApi().state.tasks).toHaveLength(2);
  });

  it('updates a task status', async () => {
    mockedApi.listMyTasks.mockResolvedValue({ data: [makeTask()], total: 1, page: 1, limit: 50, totalPages: 1 });
    mockedApi.updateTask.mockResolvedValue(makeTask({ status: 'COMPLETED' }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    await act(async () => getApi().setStatus('t-1', 'COMPLETED'));

    expect(mockedApi.updateTask).toHaveBeenCalledWith('token-123', 't-1', 'COMPLETED');
    expect(getApi().state.tasks[0].status).toBe('COMPLETED');
  });

  it('classifies an error and clears it on request', async () => {
    mockedApi.listMyTasks.mockRejectedValue(new ApiError(401, 'Sign in required'));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    expect(getApi().state.error?.kind).toBe('authentication');
    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });

  it('requires authentication before loading', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().load());
    expect(mockedApi.listMyTasks).not.toHaveBeenCalled();
  });
});
