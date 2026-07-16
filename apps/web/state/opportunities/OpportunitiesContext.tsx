'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  listOpportunities,
  type ListOpportunitiesParams,
  type OpportunityDto,
} from '../../lib/api/opportunities';
import {
  listSavedOpportunities,
  removeSavedOpportunity,
  saveOpportunity,
  updateSavedOpportunity,
  type SavedOpportunityDto,
  type TrackingStatus,
} from '../../lib/api/saved-opportunities';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type OpportunityErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface OpportunityError {
  kind: OpportunityErrorKind;
  message: string;
  retryable: boolean;
}

interface ResultsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface State {
  query: ListOpportunitiesParams;
  results: OpportunityDto[];
  meta: ResultsMeta | null;
  isSearching: boolean;
  isLoadingMore: boolean;
  savedByOpportunityId: Record<string, SavedOpportunityDto>;
  isLoadingSaved: boolean;
  error: OpportunityError | null;
}

type Action =
  | { type: 'search/start'; query: ListOpportunitiesParams }
  | { type: 'search/success'; results: OpportunityDto[]; meta: ResultsMeta }
  | { type: 'more/start' }
  | { type: 'more/success'; results: OpportunityDto[]; meta: ResultsMeta }
  | { type: 'saved/loading' }
  | { type: 'saved/loaded'; saved: SavedOpportunityDto[] }
  | { type: 'saved/upserted'; saved: SavedOpportunityDto }
  | { type: 'saved/removed'; opportunityId: string }
  | { type: 'error'; error: OpportunityError }
  | { type: 'error/clear' };

const initialState: State = {
  query: {},
  results: [],
  meta: null,
  isSearching: false,
  isLoadingMore: false,
  savedByOpportunityId: {},
  isLoadingSaved: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'search/start':
      return { ...state, isSearching: true, query: action.query, error: null };
    case 'search/success':
      return { ...state, isSearching: false, results: action.results, meta: action.meta };
    case 'more/start':
      return { ...state, isLoadingMore: true };
    case 'more/success':
      return { ...state, isLoadingMore: false, results: [...state.results, ...action.results], meta: action.meta };
    case 'saved/loading':
      return { ...state, isLoadingSaved: true };
    case 'saved/loaded': {
      const savedByOpportunityId: Record<string, SavedOpportunityDto> = {};
      for (const saved of action.saved) savedByOpportunityId[saved.opportunityId] = saved;
      return { ...state, isLoadingSaved: false, savedByOpportunityId };
    }
    case 'saved/upserted':
      return {
        ...state,
        savedByOpportunityId: { ...state.savedByOpportunityId, [action.saved.opportunityId]: action.saved },
      };
    case 'saved/removed': {
      const savedByOpportunityId = { ...state.savedByOpportunityId };
      delete savedByOpportunityId[action.opportunityId];
      return { ...state, savedByOpportunityId };
    }
    case 'error':
      return { ...state, isSearching: false, isLoadingMore: false, isLoadingSaved: false, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): OpportunityError {
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

interface UpdateSavedInput {
  isFavorite?: boolean;
  trackingStatus?: TrackingStatus;
  notes?: string;
}

interface OpportunitiesContextValue {
  state: State;
  search: (params: ListOpportunitiesParams) => Promise<void>;
  loadMore: () => Promise<void>;
  loadSaved: () => Promise<void>;
  toggleSave: (opportunityId: string) => Promise<void>;
  updateSaved: (opportunityId: string, update: UpdateSavedInput) => Promise<void>;
  isSaved: (opportunityId: string) => boolean;
  clearError: () => void;
}

const OpportunitiesContext = createContext<OpportunitiesContextValue | null>(null);

export function OpportunitiesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const search = useCallback(
    async (params: ListOpportunitiesParams) => {
      if (!session.accessToken) return;
      dispatch({ type: 'search/start', query: params });
      try {
        const result = await listOpportunities(session.accessToken, params);
        dispatch({
          type: 'search/success',
          results: result.data,
          meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
        });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadMore = useCallback(async () => {
    if (!session.accessToken || !state.meta || state.isLoadingMore) return;
    if (state.meta.page >= state.meta.totalPages) return;
    dispatch({ type: 'more/start' });
    try {
      const nextPage = state.meta.page + 1;
      const result = await listOpportunities(session.accessToken, { ...state.query, page: nextPage });
      dispatch({
        type: 'more/success',
        results: result.data,
        meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
      });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken, state.meta, state.query, state.isLoadingMore]);

  const loadSaved = useCallback(async () => {
    if (!session.accessToken || !session.memberId) return;
    dispatch({ type: 'saved/loading' });
    try {
      const saved = await listSavedOpportunities(session.accessToken, session.memberId);
      dispatch({ type: 'saved/loaded', saved });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken, session.memberId]);

  const toggleSave = useCallback(
    async (opportunityId: string) => {
      if (!session.accessToken || !session.memberId) return;
      const alreadySaved = !!state.savedByOpportunityId[opportunityId];
      try {
        if (alreadySaved) {
          await removeSavedOpportunity(session.accessToken, session.memberId, opportunityId);
          dispatch({ type: 'saved/removed', opportunityId });
        } else {
          const saved = await saveOpportunity(session.accessToken, session.memberId, opportunityId);
          dispatch({ type: 'saved/upserted', saved });
        }
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, session.memberId, state.savedByOpportunityId],
  );

  const updateSaved = useCallback(
    async (opportunityId: string, update: UpdateSavedInput) => {
      if (!session.accessToken || !session.memberId) return;
      try {
        const saved = await updateSavedOpportunity(session.accessToken, session.memberId, opportunityId, update);
        dispatch({ type: 'saved/upserted', saved });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, session.memberId],
  );

  const isSaved = useCallback(
    (opportunityId: string) => !!state.savedByOpportunityId[opportunityId],
    [state.savedByOpportunityId],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({ state, search, loadMore, loadSaved, toggleSave, updateSaved, isSaved, clearError }),
    [state, search, loadMore, loadSaved, toggleSave, updateSaved, isSaved, clearError],
  );

  return <OpportunitiesContext.Provider value={value}>{children}</OpportunitiesContext.Provider>;
}

export function useOpportunities(): OpportunitiesContextValue {
  const context = useContext(OpportunitiesContext);
  if (!context) {
    throw new Error('useOpportunities must be used within an OpportunitiesProvider');
  }
  return context;
}
