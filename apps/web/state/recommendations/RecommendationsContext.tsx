'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  approveRecommendation,
  dismissRecommendation,
  generateRecommendations,
  listRecommendations,
  type RecommendationCategory,
  type RecommendationDto,
} from '../../lib/api/recommendations';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type RecommendationErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface RecommendationError {
  kind: RecommendationErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  recommendations: RecommendationDto[];
  isGenerating: boolean;
  isLoading: boolean;
  decidingIds: string[];
  error: RecommendationError | null;
}

type Action =
  | { type: 'generate/start' }
  | { type: 'generate/success'; recommendations: RecommendationDto[] }
  | { type: 'list/loading' }
  | { type: 'list/loaded'; recommendations: RecommendationDto[] }
  | { type: 'decide/start'; id: string }
  | { type: 'decide/success'; recommendation: RecommendationDto }
  | { type: 'decide/settled'; id: string }
  | { type: 'error'; error: RecommendationError }
  | { type: 'error/clear' };

const initialState: State = {
  recommendations: [],
  isGenerating: false,
  isLoading: false,
  decidingIds: [],
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'generate/start':
      return { ...state, isGenerating: true, error: null };
    case 'generate/success':
      return {
        ...state,
        isGenerating: false,
        recommendations: [...action.recommendations, ...state.recommendations],
      };
    case 'list/loading':
      return { ...state, isLoading: true };
    case 'list/loaded':
      return { ...state, isLoading: false, recommendations: action.recommendations };
    case 'decide/start':
      return { ...state, decidingIds: [...state.decidingIds, action.id], error: null };
    case 'decide/success':
      return {
        ...state,
        recommendations: state.recommendations.map((r) => (r.id === action.recommendation.id ? action.recommendation : r)),
      };
    case 'decide/settled':
      return { ...state, decidingIds: state.decidingIds.filter((id) => id !== action.id) };
    case 'error':
      return { ...state, isGenerating: false, isLoading: false, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): RecommendationError {
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

interface RecommendationsContextValue {
  state: State;
  generate: (category: RecommendationCategory) => Promise<void>;
  loadMine: () => Promise<void>;
  approve: (id: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  isDeciding: (id: string) => boolean;
  clearError: () => void;
}

const RecommendationsContext = createContext<RecommendationsContextValue | null>(null);

export function RecommendationsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const generate = useCallback(
    async (category: RecommendationCategory) => {
      if (!session.accessToken || state.isGenerating) return;
      dispatch({ type: 'generate/start' });
      try {
        const recommendations = await generateRecommendations(session.accessToken, category);
        dispatch({ type: 'generate/success', recommendations });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, state.isGenerating],
  );

  const loadMine = useCallback(async () => {
    if (!session.accessToken) return;
    dispatch({ type: 'list/loading' });
    try {
      const result = await listRecommendations(session.accessToken);
      dispatch({ type: 'list/loaded', recommendations: result.data });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const decide = useCallback(
    async (id: string, action: 'approve' | 'dismiss') => {
      if (!session.accessToken) return;
      dispatch({ type: 'decide/start', id });
      try {
        const recommendation =
          action === 'approve'
            ? await approveRecommendation(session.accessToken, id)
            : await dismissRecommendation(session.accessToken, id);
        dispatch({ type: 'decide/success', recommendation });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      } finally {
        dispatch({ type: 'decide/settled', id });
      }
    },
    [session.accessToken],
  );

  const approve = useCallback((id: string) => decide(id, 'approve'), [decide]);
  const dismiss = useCallback((id: string) => decide(id, 'dismiss'), [decide]);
  const isDeciding = useCallback((id: string) => state.decidingIds.includes(id), [state.decidingIds]);
  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({ state, generate, loadMine, approve, dismiss, isDeciding, clearError }),
    [state, generate, loadMine, approve, dismiss, isDeciding, clearError],
  );

  return <RecommendationsContext.Provider value={value}>{children}</RecommendationsContext.Provider>;
}

export function useRecommendations(): RecommendationsContextValue {
  const context = useContext(RecommendationsContext);
  if (!context) {
    throw new Error('useRecommendations must be used within a RecommendationsProvider');
  }
  return context;
}
