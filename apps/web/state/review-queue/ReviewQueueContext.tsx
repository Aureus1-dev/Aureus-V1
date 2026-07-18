'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  listPendingReview,
  rejectPendingReview,
  verifyPendingReview,
  type PendingReviewItemDto,
  type ReviewDomain,
} from '../../lib/api/review-queue';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type ReviewQueueErrorKind = 'authentication' | 'authorization' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface ReviewQueueError {
  kind: ReviewQueueErrorKind;
  message: string;
  retryable: boolean;
}

const DOMAINS: ReviewDomain[] = ['resources', 'organizations', 'opportunities', 'knowledge', 'academy'];

interface State {
  items: PendingReviewItemDto[];
  isLoading: boolean;
  updatingId: string | null;
  error: ReviewQueueError | null;
}

type Action =
  | { type: 'loading' }
  | { type: 'loaded'; items: PendingReviewItemDto[] }
  | { type: 'item/saving'; id: string }
  | { type: 'item/resolved'; id: string }
  | { type: 'error'; error: ReviewQueueError }
  | { type: 'error/clear' };

const initialState: State = { items: [], isLoading: false, updatingId: null, error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loading':
      return { ...state, isLoading: true };
    case 'loaded':
      return { ...state, isLoading: false, items: action.items };
    case 'item/saving':
      return { ...state, updatingId: action.id };
    case 'item/resolved':
      return { ...state, updatingId: null, items: state.items.filter((item) => item.id !== action.id) };
    case 'error':
      return { ...state, isLoading: false, updatingId: null, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): ReviewQueueError {
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

interface ReviewQueueContextValue {
  state: State;
  load: () => Promise<void>;
  verify: (domain: ReviewDomain, id: string) => Promise<void>;
  reject: (domain: ReviewDomain, id: string, reason: string) => Promise<void>;
  clearError: () => void;
}

const ReviewQueueContext = createContext<ReviewQueueContextValue | null>(null);

/**
 * The Founder Operating System's Review Queue (PR-003) — a unified
 * verify/reject surface over five domains that each already have their own
 * independent PENDING_REVIEW workflow (Resources, Organizations,
 * Opportunities, Knowledge, Academy). This context aggregates their
 * pending items into one flat list; it never duplicates each domain's own
 * CRUD state (FPB-010 §7) — verify/reject act directly against each
 * domain's backend endpoint via `lib/api/review-queue.ts`.
 */
export function ReviewQueueProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(async () => {
    if (!session.accessToken) return;
    const accessToken = session.accessToken;
    dispatch({ type: 'loading' });
    try {
      const results = await Promise.all(DOMAINS.map((domain) => listPendingReview(accessToken, domain)));
      const items = results.flatMap((result) => result.items);
      dispatch({ type: 'loaded', items });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const verify = useCallback(
    async (domain: ReviewDomain, id: string) => {
      if (!session.accessToken || !session.memberId) return;
      dispatch({ type: 'item/saving', id });
      try {
        await verifyPendingReview(session.accessToken, domain, id, session.memberId);
        dispatch({ type: 'item/resolved', id });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, session.memberId],
  );

  const reject = useCallback(
    async (domain: ReviewDomain, id: string, reason: string) => {
      if (!session.accessToken || !session.memberId) return;
      dispatch({ type: 'item/saving', id });
      try {
        await rejectPendingReview(session.accessToken, domain, id, reason, session.memberId);
        dispatch({ type: 'item/resolved', id });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, session.memberId],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({ state, load, verify, reject, clearError }),
    [state, load, verify, reject, clearError],
  );

  return <ReviewQueueContext.Provider value={value}>{children}</ReviewQueueContext.Provider>;
}

export function useReviewQueue(): ReviewQueueContextValue {
  const context = useContext(ReviewQueueContext);
  if (!context) {
    throw new Error('useReviewQueue must be used within a ReviewQueueProvider');
  }
  return context;
}
