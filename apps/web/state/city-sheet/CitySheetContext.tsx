'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  listCitySheetEntries,
  getVerificationGuide,
  listVerificationHistory,
  verifyCitySheetEntry,
  rejectCitySheetEntry,
  flagCitySheetEntryForReview,
  type CitySheetEntryDto,
  type CitySheetVerificationStatus,
  type VerificationGuideDto,
  type VerificationEventDto,
  type VerifyEntryInput,
  type RejectEntryInput,
  type FlagEntryForReviewInput,
} from '../../lib/api/city-sheet';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type CitySheetErrorKind = 'authentication' | 'authorization' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface CitySheetError {
  kind: CitySheetErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  entries: CitySheetEntryDto[];
  isLoadingQueue: boolean;
  selectedEntryId: string | null;
  guide: VerificationGuideDto | null;
  history: VerificationEventDto[];
  isLoadingDetail: boolean;
  submittingId: string | null;
  error: CitySheetError | null;
}

type Action =
  | { type: 'queue/loading' }
  | { type: 'queue/loaded'; entries: CitySheetEntryDto[] }
  | { type: 'detail/loading'; id: string }
  | { type: 'detail/loaded'; id: string; guide: VerificationGuideDto; history: VerificationEventDto[] }
  | { type: 'detail/cleared' }
  | { type: 'entry/submitting'; id: string }
  | { type: 'entry/resolved'; entry: CitySheetEntryDto }
  | { type: 'error'; error: CitySheetError }
  | { type: 'error/clear' };

const initialState: State = {
  entries: [], isLoadingQueue: false, selectedEntryId: null, guide: null, history: [],
  isLoadingDetail: false, submittingId: null, error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'queue/loading':
      return { ...state, isLoadingQueue: true };
    case 'queue/loaded':
      return { ...state, isLoadingQueue: false, entries: action.entries };
    case 'detail/loading':
      return { ...state, isLoadingDetail: true, selectedEntryId: action.id, guide: null, history: [] };
    case 'detail/loaded':
      return { ...state, isLoadingDetail: false, guide: action.guide, history: action.history };
    case 'detail/cleared':
      return { ...state, selectedEntryId: null, guide: null, history: [] };
    case 'entry/submitting':
      return { ...state, submittingId: action.id };
    case 'entry/resolved':
      return {
        ...state,
        submittingId: null,
        // A resolved entry (VERIFIED/REJECTED) leaves the default
        // UNVERIFIED/NEEDS_REVIEW queue — remove it rather than show a
        // stale status until the next reload.
        entries: state.entries.filter((entry) => entry.id !== action.entry.id),
        selectedEntryId: state.selectedEntryId === action.entry.id ? null : state.selectedEntryId,
        guide: state.selectedEntryId === action.entry.id ? null : state.guide,
        history: state.selectedEntryId === action.entry.id ? [] : state.history,
      };
    case 'error':
      return { ...state, isLoadingQueue: false, isLoadingDetail: false, submittingId: null, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): CitySheetError {
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

interface CitySheetContextValue {
  state: State;
  loadQueue: (verificationStatus?: CitySheetVerificationStatus) => Promise<void>;
  selectEntry: (id: string) => Promise<void>;
  clearSelection: () => void;
  verify: (id: string, input: VerifyEntryInput) => Promise<void>;
  reject: (id: string, input: RejectEntryInput) => Promise<void>;
  flagForReview: (id: string, input: FlagEntryForReviewInput) => Promise<void>;
  clearError: () => void;
}

const CitySheetContext = createContext<CitySheetContextValue | null>(null);

/**
 * A4 engineering (Human Steward Verification Workflow, frontend half).
 * This is the engineering component that lets a Human Steward complete A4
 * *through the application* rather than raw API calls — it never performs
 * or simulates verification itself; every state change here is a direct,
 * unmodified relay of a real human's own decision (confidence, notes,
 * checklist answers) to the backend's `/city-sheet/:id/verify|reject|
 * flag-for-review` endpoints, which remain the only place
 * `verificationStatus` actually changes. A4 itself is not "done" by this
 * component existing — it's done when a Human Steward has actually used it
 * on all 8 candidates.
 */
export function CitySheetProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadQueue = useCallback(
    async (verificationStatus: CitySheetVerificationStatus = 'UNVERIFIED') => {
      if (!session.accessToken) return;
      const accessToken = session.accessToken;
      dispatch({ type: 'queue/loading' });
      try {
        const result = await listCitySheetEntries(accessToken, { verificationStatus });
        dispatch({ type: 'queue/loaded', entries: result.data });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const selectEntry = useCallback(
    async (id: string) => {
      if (!session.accessToken) return;
      const accessToken = session.accessToken;
      dispatch({ type: 'detail/loading', id });
      try {
        const [guide, history] = await Promise.all([
          getVerificationGuide(accessToken, id),
          listVerificationHistory(accessToken, id),
        ]);
        dispatch({ type: 'detail/loaded', id, guide, history });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const clearSelection = useCallback(() => dispatch({ type: 'detail/cleared' }), []);

  const verify = useCallback(
    async (id: string, input: VerifyEntryInput) => {
      if (!session.accessToken) return;
      dispatch({ type: 'entry/submitting', id });
      try {
        const entry = await verifyCitySheetEntry(session.accessToken, id, input);
        dispatch({ type: 'entry/resolved', entry });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const reject = useCallback(
    async (id: string, input: RejectEntryInput) => {
      if (!session.accessToken) return;
      dispatch({ type: 'entry/submitting', id });
      try {
        const entry = await rejectCitySheetEntry(session.accessToken, id, input);
        dispatch({ type: 'entry/resolved', entry });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const flagForReview = useCallback(
    async (id: string, input: FlagEntryForReviewInput) => {
      if (!session.accessToken) return;
      dispatch({ type: 'entry/submitting', id });
      try {
        const entry = await flagCitySheetEntryForReview(session.accessToken, id, input);
        dispatch({ type: 'entry/resolved', entry });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({ state, loadQueue, selectEntry, clearSelection, verify, reject, flagForReview, clearError }),
    [state, loadQueue, selectEntry, clearSelection, verify, reject, flagForReview, clearError],
  );

  return <CitySheetContext.Provider value={value}>{children}</CitySheetContext.Provider>;
}

export function useCitySheet(): CitySheetContextValue {
  const context = useContext(CitySheetContext);
  if (!context) {
    throw new Error('useCitySheet must be used within a CitySheetProvider');
  }
  return context;
}
