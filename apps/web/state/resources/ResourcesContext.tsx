'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { listResources, type ListResourcesParams, type ResourceDto } from '../../lib/api/resources';
import {
  listSavedResources,
  removeSavedResource,
  saveResource,
  updateSavedResource,
  type SavedResourceDto,
} from '../../lib/api/saved-resources';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type ResourceErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface ResourceError {
  kind: ResourceErrorKind;
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
  query: ListResourcesParams;
  results: ResourceDto[];
  meta: ResultsMeta | null;
  isSearching: boolean;
  isLoadingMore: boolean;
  savedByResourceId: Record<string, SavedResourceDto>;
  isLoadingSaved: boolean;
  error: ResourceError | null;
}

type Action =
  | { type: 'search/start'; query: ListResourcesParams }
  | { type: 'search/success'; results: ResourceDto[]; meta: ResultsMeta }
  | { type: 'more/start' }
  | { type: 'more/success'; results: ResourceDto[]; meta: ResultsMeta }
  | { type: 'saved/loading' }
  | { type: 'saved/loaded'; saved: SavedResourceDto[] }
  | { type: 'saved/upserted'; saved: SavedResourceDto }
  | { type: 'saved/removed'; resourceId: string }
  | { type: 'error'; error: ResourceError }
  | { type: 'error/clear' };

const initialState: State = {
  query: {},
  results: [],
  meta: null,
  isSearching: false,
  isLoadingMore: false,
  savedByResourceId: {},
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
      const savedByResourceId: Record<string, SavedResourceDto> = {};
      for (const saved of action.saved) savedByResourceId[saved.resourceId] = saved;
      return { ...state, isLoadingSaved: false, savedByResourceId };
    }
    case 'saved/upserted':
      return { ...state, savedByResourceId: { ...state.savedByResourceId, [action.saved.resourceId]: action.saved } };
    case 'saved/removed': {
      const savedByResourceId = { ...state.savedByResourceId };
      delete savedByResourceId[action.resourceId];
      return { ...state, savedByResourceId };
    }
    case 'error':
      return { ...state, isSearching: false, isLoadingMore: false, isLoadingSaved: false, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): ResourceError {
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
  notes?: string;
}

interface ResourcesContextValue {
  state: State;
  search: (params: ListResourcesParams) => Promise<void>;
  loadMore: () => Promise<void>;
  loadSaved: () => Promise<void>;
  toggleSave: (resourceId: string) => Promise<void>;
  updateSaved: (resourceId: string, update: UpdateSavedInput) => Promise<void>;
  isSaved: (resourceId: string) => boolean;
  clearError: () => void;
}

const ResourcesContext = createContext<ResourcesContextValue | null>(null);

/**
 * The standing Resources surface (PR-002) — the same search/save shape
 * as Opportunities (`OpportunitiesContext`), since the Resource Directory
 * backend (list/search VERIFIED-only, self-scoped saved-resource
 * tracking) mirrors it exactly.
 */
export function ResourcesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const search = useCallback(
    async (params: ListResourcesParams) => {
      if (!session.accessToken) return;
      dispatch({ type: 'search/start', query: params });
      try {
        const result = await listResources(session.accessToken, params);
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
      const result = await listResources(session.accessToken, { ...state.query, page: nextPage });
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
      const saved = await listSavedResources(session.accessToken, session.memberId);
      dispatch({ type: 'saved/loaded', saved });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken, session.memberId]);

  const toggleSave = useCallback(
    async (resourceId: string) => {
      if (!session.accessToken || !session.memberId) return;
      const alreadySaved = !!state.savedByResourceId[resourceId];
      try {
        if (alreadySaved) {
          await removeSavedResource(session.accessToken, session.memberId, resourceId);
          dispatch({ type: 'saved/removed', resourceId });
        } else {
          const saved = await saveResource(session.accessToken, session.memberId, resourceId);
          dispatch({ type: 'saved/upserted', saved });
        }
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, session.memberId, state.savedByResourceId],
  );

  const updateSaved = useCallback(
    async (resourceId: string, update: UpdateSavedInput) => {
      if (!session.accessToken || !session.memberId) return;
      try {
        const saved = await updateSavedResource(session.accessToken, session.memberId, resourceId, update);
        dispatch({ type: 'saved/upserted', saved });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, session.memberId],
  );

  const isSaved = useCallback((resourceId: string) => !!state.savedByResourceId[resourceId], [state.savedByResourceId]);

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({ state, search, loadMore, loadSaved, toggleSave, updateSaved, isSaved, clearError }),
    [state, search, loadMore, loadSaved, toggleSave, updateSaved, isSaved, clearError],
  );

  return <ResourcesContext.Provider value={value}>{children}</ResourcesContext.Provider>;
}

export function useResources(): ResourcesContextValue {
  const context = useContext(ResourcesContext);
  if (!context) {
    throw new Error('useResources must be used within a ResourcesProvider');
  }
  return context;
}
