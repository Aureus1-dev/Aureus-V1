'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { getMyMemory, type InstitutionalMemoryDto } from '../../lib/api/memory';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type MemoryErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface MemoryError {
  kind: MemoryErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  memory: InstitutionalMemoryDto | null;
  isLoading: boolean;
  error: MemoryError | null;
}

type Action =
  | { type: 'load/start' }
  | { type: 'load/success'; memory: InstitutionalMemoryDto }
  | { type: 'error'; error: MemoryError }
  | { type: 'error/clear' };

const initialState: State = {
  memory: null,
  isLoading: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load/start':
      return { ...state, isLoading: true, error: null };
    case 'load/success':
      return { ...state, isLoading: false, memory: action.memory };
    case 'error':
      return { ...state, isLoading: false, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): MemoryError {
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

interface MemoryContextValue {
  state: State;
  /** Reloads the caller's own institutional memory — the same read-only bundle the AI Orchestrator already reasons from, now shown in the Steward context panel. */
  loadMemory: () => Promise<void>;
  clearError: () => void;
}

const MemoryContext = createContext<MemoryContextValue | null>(null);

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadMemory = useCallback(async () => {
    if (!session.accessToken || state.isLoading) return;
    dispatch({ type: 'load/start' });
    try {
      const memory = await getMyMemory(session.accessToken);
      dispatch({ type: 'load/success', memory });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken, state.isLoading]);

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(() => ({ state, loadMemory, clearError }), [state, loadMemory, clearError]);

  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
}

export function useMemory(): MemoryContextValue {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemory must be used within a MemoryProvider');
  }
  return context;
}
