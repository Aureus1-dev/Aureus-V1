'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { buildCoordinatedPlan, type CoordinatedPlanDto } from '../../lib/api/plan';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type PlanErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface PlanError {
  kind: PlanErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  plan: CoordinatedPlanDto | null;
  isBuilding: boolean;
  error: PlanError | null;
}

type Action =
  | { type: 'build/start' }
  | { type: 'build/success'; plan: CoordinatedPlanDto | null }
  | { type: 'error'; error: PlanError }
  | { type: 'error/clear' }
  | { type: 'reset' };

const initialState: State = {
  plan: null,
  isBuilding: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'build/start':
      return { ...state, isBuilding: true, error: null };
    case 'build/success':
      return { ...state, isBuilding: false, plan: action.plan };
    case 'error':
      return { ...state, isBuilding: false, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    case 'reset':
      return initialState;
    default:
      return state;
  }
}

function classifyError(error: unknown): PlanError {
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

interface PlanContextValue {
  state: State;
  /**
   * Builds one coordinated plan (Member Arrival — Steward Experience
   * migration): a single Primary next step plus genuinely useful
   * Supporting steps, coordinated across every relevant Aureus system.
   * `needId` grounds the plan in a specific stated need (City Sheet
   * matches lead when one exists); omitted, the plan is still built from
   * the AI Recommendation categories alone. A NO_ACTION run (no real
   * candidates found anywhere) resolves with `state.plan` left `null`
   * rather than surfaced as an error.
   */
  buildPlan: (needId?: string) => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const buildPlan = useCallback(
    async (needId?: string) => {
      if (!session.accessToken || state.isBuilding) return;
      dispatch({ type: 'build/start' });
      try {
        const response = await buildCoordinatedPlan(session.accessToken, needId);
        dispatch({ type: 'build/success', plan: response.plan ?? null });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, state.isBuilding],
  );

  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({ state, buildPlan, reset, clearError }),
    [state, buildPlan, reset, clearError],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}
