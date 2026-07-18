'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { listUsers, type UserDto } from '../../lib/api/users';
import {
  getStewardMetrics,
  listStewardshipRelationships,
  type StewardMetricsDto,
  type StewardshipRelationshipDto,
} from '../../lib/api/stewardship';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type StewardshipOversightErrorKind = 'authentication' | 'authorization' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface StewardshipOversightError {
  kind: StewardshipOversightErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  stewards: UserDto[];
  metricsByStewardId: Record<string, StewardMetricsDto>;
  relationships: StewardshipRelationshipDto[];
  relationshipsTotal: number;
  isLoading: boolean;
  error: StewardshipOversightError | null;
}

type Action =
  | { type: 'loading' }
  | {
      type: 'loaded';
      stewards: UserDto[];
      metricsByStewardId: Record<string, StewardMetricsDto>;
      relationships: StewardshipRelationshipDto[];
      relationshipsTotal: number;
    }
  | { type: 'error'; error: StewardshipOversightError }
  | { type: 'error/clear' };

const initialState: State = {
  stewards: [], metricsByStewardId: {}, relationships: [], relationshipsTotal: 0, isLoading: false, error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loading':
      return { ...state, isLoading: true };
    case 'loaded':
      return {
        ...state, isLoading: false,
        stewards: action.stewards, metricsByStewardId: action.metricsByStewardId,
        relationships: action.relationships, relationshipsTotal: action.relationshipsTotal,
      };
    case 'error':
      return { ...state, isLoading: false, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): StewardshipOversightError {
  if (error instanceof ApiError) {
    if (error.isAuthenticationRequired) return { kind: 'authentication', message: error.message, retryable: false };
    if (error.status === 403) return { kind: 'authorization', message: error.message, retryable: false };
    if (error.isRateLimited) return { kind: 'rate-limited', message: error.message, retryable: true };
    if (error.isServiceUnavailable) return { kind: 'unavailable', message: error.message, retryable: true };
    if (error.isValidationError) return { kind: 'validation', message: error.message, retryable: false };
    return { kind: 'unknown', message: error.message, retryable: error.retryable };
  }
  if (error instanceof NetworkError) return { kind: 'network', message: error.message, retryable: true };
  return { kind: 'unknown', message: 'Something unexpected happened.', retryable: true };
}

interface StewardshipOversightContextValue {
  state: State;
  load: () => Promise<void>;
  clearError: () => void;
}

const StewardshipOversightContext = createContext<StewardshipOversightContextValue | null>(null);

/**
 * The Founder Operating System's Stewardship Oversight panel (PR-003) —
 * the platform-wide steward roster (every user holding the STEWARD role),
 * each steward's own performance metrics (`StewardMetricsService`, reused
 * verbatim from PA-012), and the unscoped relationship list an
 * Administrator already sees from `StewardshipRelationshipsService.findAll`
 * (no separate admin-only endpoint needed — that authorization already
 * exists server-side).
 */
export function StewardshipOversightProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(async () => {
    if (!session.accessToken) return;
    const accessToken = session.accessToken;
    dispatch({ type: 'loading' });
    try {
      const [stewardsResult, relationshipsResult] = await Promise.all([
        listUsers(accessToken, { role: 'STEWARD', limit: 100 }),
        listStewardshipRelationships(accessToken, { limit: 100 }),
      ]);

      const metricsEntries = await Promise.all(
        stewardsResult.data.map(async (steward) => [steward.id, await getStewardMetrics(accessToken, steward.id)] as const),
      );

      dispatch({
        type: 'loaded',
        stewards: stewardsResult.data,
        metricsByStewardId: Object.fromEntries(metricsEntries),
        relationships: relationshipsResult.data,
        relationshipsTotal: relationshipsResult.total,
      });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(() => ({ state, load, clearError }), [state, load, clearError]);

  return <StewardshipOversightContext.Provider value={value}>{children}</StewardshipOversightContext.Provider>;
}

export function useStewardshipOversight(): StewardshipOversightContextValue {
  const context = useContext(StewardshipOversightContext);
  if (!context) {
    throw new Error('useStewardshipOversight must be used within a StewardshipOversightProvider');
  }
  return context;
}
