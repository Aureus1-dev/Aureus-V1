'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { listMyTasks, updateTask, type TaskDto, type TaskStatus } from '../../lib/api/tasks';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type TasksErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface TasksError {
  kind: TasksErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  tasks: TaskDto[];
  isLoading: boolean;
  updatingTaskId: string | null;
  error: TasksError | null;
}

type Action =
  | { type: 'load/start' }
  | { type: 'load/success'; tasks: TaskDto[] }
  | { type: 'update/start'; taskId: string }
  | { type: 'update/success'; task: TaskDto }
  | { type: 'error'; error: TasksError }
  | { type: 'error/clear' };

const initialState: State = {
  tasks: [],
  isLoading: false,
  updatingTaskId: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load/start':
      return { ...state, isLoading: true };
    case 'load/success':
      return { ...state, isLoading: false, tasks: action.tasks };
    case 'update/start':
      return { ...state, updatingTaskId: action.taskId };
    case 'update/success':
      return {
        ...state,
        updatingTaskId: null,
        tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)),
      };
    case 'error':
      return { ...state, isLoading: false, updatingTaskId: null, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): TasksError {
  if (error instanceof ApiError) {
    if (error.isAuthenticationRequired) return { kind: 'authentication', message: error.message, retryable: false };
    if (error.isRateLimited) return { kind: 'rate-limited', message: error.message, retryable: true };
    if (error.isServiceUnavailable) return { kind: 'unavailable', message: error.message, retryable: true };
    if (error.isValidationError) return { kind: 'validation', message: error.message, retryable: false };
    return { kind: 'unknown', message: error.message, retryable: error.retryable };
  }
  if (error instanceof NetworkError) return { kind: 'network', message: error.message, retryable: true };
  return { kind: 'unknown', message: 'Something unexpected happened.', retryable: true };
}

interface TasksContextValue {
  state: State;
  load: () => Promise<void>;
  setStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  clearError: () => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

/**
 * The standing Tasks surface (PR-002) — every task the member owns
 * across every Journey/Milestone, not scoped to one in-progress Journey
 * the way `JourneyContext.tasksByMilestoneId` is. Backed by the same
 * `/tasks` endpoint, self-scoped when no `milestoneId` is given
 * (`TasksService.findAll`).
 */
export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(async () => {
    if (!session.accessToken) return;
    dispatch({ type: 'load/start' });
    try {
      const result = await listMyTasks(session.accessToken);
      dispatch({ type: 'load/success', tasks: result.data });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const setStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      if (!session.accessToken) return;
      dispatch({ type: 'update/start', taskId });
      try {
        const task = await updateTask(session.accessToken, taskId, status);
        dispatch({ type: 'update/success', task });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(() => ({ state, load, setStatus, clearError }), [state, load, setStatus, clearError]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}
