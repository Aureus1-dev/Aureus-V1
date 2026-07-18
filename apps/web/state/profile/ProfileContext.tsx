'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  createMyProfile,
  getMyProfile,
  updateMyProfile,
  type ProfileDto,
  type UpdateProfileInput,
} from '../../lib/api/profile';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type ProfileErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface ProfileError {
  kind: ProfileErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  profile: ProfileDto | null;
  isLoading: boolean;
  isSaving: boolean;
  error: ProfileError | null;
}

type Action =
  | { type: 'load/start' }
  | { type: 'load/success'; profile: ProfileDto | null }
  | { type: 'save/start' }
  | { type: 'save/success'; profile: ProfileDto }
  | { type: 'error'; error: ProfileError }
  | { type: 'error/clear' };

const initialState: State = {
  profile: null,
  isLoading: false,
  isSaving: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load/start':
      return { ...state, isLoading: true };
    case 'load/success':
      return { ...state, isLoading: false, profile: action.profile };
    case 'save/start':
      return { ...state, isSaving: true };
    case 'save/success':
      return { ...state, isSaving: false, profile: action.profile };
    case 'error':
      return { ...state, isLoading: false, isSaving: false, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): ProfileError {
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

interface ProfileContextValue {
  state: State;
  load: () => Promise<void>;
  save: (input: UpdateProfileInput) => Promise<void>;
  clearError: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * `save` creates the Profile on first save and updates it thereafter
 * (backend `POST` on first write, `PATCH` after) — one member-facing
 * action either way, since a member editing their Profile for the first
 * time is not conceptually different from editing it again (PR-002).
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(async () => {
    if (!session.accessToken || !session.memberId) return;
    dispatch({ type: 'load/start' });
    try {
      const profile = await getMyProfile(session.accessToken, session.memberId);
      dispatch({ type: 'load/success', profile });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken, session.memberId]);

  const save = useCallback(
    async (input: UpdateProfileInput) => {
      if (!session.accessToken || !session.memberId) return;
      dispatch({ type: 'save/start' });
      try {
        const profile = state.profile
          ? await updateMyProfile(session.accessToken, session.memberId, input)
          : await createMyProfile(session.accessToken, session.memberId, input);
        dispatch({ type: 'save/success', profile });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, session.memberId, state.profile],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(() => ({ state, load, save, clearError }), [state, load, save, clearError]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
