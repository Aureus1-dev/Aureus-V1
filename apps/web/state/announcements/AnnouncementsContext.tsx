'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  archiveAnnouncement,
  createAnnouncement,
  listAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
  type AnnouncementDto,
  type CreateAnnouncementInput,
  type ListAnnouncementsParams,
  type UpdateAnnouncementInput,
} from '../../lib/api/announcements';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type AnnouncementsErrorKind = 'authentication' | 'authorization' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface AnnouncementsError {
  kind: AnnouncementsErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  announcements: AnnouncementDto[];
  total: number;
  isLoading: boolean;
  isSaving: boolean;
  savingId: string | null;
  error: AnnouncementsError | null;
}

type Action =
  | { type: 'loading' }
  | { type: 'loaded'; announcements: AnnouncementDto[]; total: number }
  | { type: 'creating' }
  | { type: 'created'; announcement: AnnouncementDto }
  | { type: 'item/saving'; id: string }
  | { type: 'item/saved'; announcement: AnnouncementDto }
  | { type: 'error'; error: AnnouncementsError }
  | { type: 'error/clear' };

const initialState: State = {
  announcements: [], total: 0, isLoading: false, isSaving: false, savingId: null, error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loading':
      return { ...state, isLoading: true };
    case 'loaded':
      return { ...state, isLoading: false, announcements: action.announcements, total: action.total };
    case 'creating':
      return { ...state, isSaving: true };
    case 'created':
      return {
        ...state, isSaving: false,
        announcements: [action.announcement, ...state.announcements], total: state.total + 1,
      };
    case 'item/saving':
      return { ...state, savingId: action.id };
    case 'item/saved':
      return {
        ...state, savingId: null,
        announcements: state.announcements.map((a) => (a.id === action.announcement.id ? action.announcement : a)),
      };
    case 'error':
      return { ...state, isLoading: false, isSaving: false, savingId: null, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): AnnouncementsError {
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

interface AnnouncementsContextValue {
  state: State;
  load: (params?: ListAnnouncementsParams) => Promise<void>;
  create: (input: CreateAnnouncementInput) => Promise<void>;
  update: (id: string, input: UpdateAnnouncementInput) => Promise<void>;
  publish: (id: string) => Promise<void>;
  archive: (id: string) => Promise<void>;
  clearError: () => void;
}

const AnnouncementsContext = createContext<AnnouncementsContextValue | null>(null);

/**
 * The Founder Operating System's Announcements composer (PR-003) — the
 * full create → publish → archive lifecycle the backend has supported
 * since PR-002 (`AnnouncementsService`), with no prior frontend surface.
 * An Administrator sees every announcement regardless of status
 * (`findAll` already grants that server-side); everyone else only ever
 * sees PUBLISHED ones addressed to them.
 */
export function AnnouncementsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(
    async (params: ListAnnouncementsParams = {}) => {
      if (!session.accessToken) return;
      dispatch({ type: 'loading' });
      try {
        const result = await listAnnouncements(session.accessToken, params);
        dispatch({ type: 'loaded', announcements: result.data, total: result.total });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const create = useCallback(
    async (input: CreateAnnouncementInput) => {
      if (!session.accessToken) return;
      dispatch({ type: 'creating' });
      try {
        const announcement = await createAnnouncement(session.accessToken, input);
        dispatch({ type: 'created', announcement });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const update = useCallback(
    async (id: string, input: UpdateAnnouncementInput) => {
      if (!session.accessToken) return;
      dispatch({ type: 'item/saving', id });
      try {
        const announcement = await updateAnnouncement(session.accessToken, id, input);
        dispatch({ type: 'item/saved', announcement });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const publish = useCallback(
    async (id: string) => {
      if (!session.accessToken) return;
      dispatch({ type: 'item/saving', id });
      try {
        const announcement = await publishAnnouncement(session.accessToken, id);
        dispatch({ type: 'item/saved', announcement });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const archive = useCallback(
    async (id: string) => {
      if (!session.accessToken) return;
      dispatch({ type: 'item/saving', id });
      try {
        const announcement = await archiveAnnouncement(session.accessToken, id);
        dispatch({ type: 'item/saved', announcement });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({ state, load, create, update, publish, archive, clearError }),
    [state, load, create, update, publish, archive, clearError],
  );

  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
}

export function useAnnouncements(): AnnouncementsContextValue {
  const context = useContext(AnnouncementsContext);
  if (!context) {
    throw new Error('useAnnouncements must be used within an AnnouncementsProvider');
  }
  return context;
}
