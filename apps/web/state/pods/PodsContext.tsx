'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  createPodRequest,
  getPod,
  leaveMembership,
  listMyInvitations,
  listMyMemberships,
  listMyPodRequests,
  listPods,
  respondToInvitation,
  respondToMembership,
  withdrawPodRequest,
  type CreateRequestInput,
  type InvitationDto,
  type ListPodsParams,
  type MembershipDto,
  type MembershipResponseDecision,
  type PodDto,
  type RequestDto,
} from '../../lib/api/pods';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type PodsErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface PodsError {
  kind: PodsErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  results: PodDto[];
  isSearching: boolean;
  memberships: MembershipDto[];
  requests: RequestDto[];
  invitations: InvitationDto[];
  /** Pod name/description lookup for memberships/requests/invitations, which reference only a podId (PR-002). */
  podsById: Record<string, PodDto>;
  isLoadingMine: boolean;
  updatingId: string | null;
  error: PodsError | null;
}

type Action =
  | { type: 'search/start' }
  | { type: 'search/success'; results: PodDto[] }
  | { type: 'mine/start' }
  | {
      type: 'mine/success';
      memberships: MembershipDto[];
      requests: RequestDto[];
      invitations: InvitationDto[];
      podsById: Record<string, PodDto>;
    }
  | { type: 'action/start'; id: string }
  | { type: 'membership/updated'; membership: MembershipDto }
  | { type: 'request/created'; request: RequestDto }
  | { type: 'request/updated'; request: RequestDto }
  | { type: 'invitation/updated'; invitation: InvitationDto }
  | { type: 'error'; error: PodsError }
  | { type: 'error/clear' };

const initialState: State = {
  results: [],
  isSearching: false,
  memberships: [],
  requests: [],
  invitations: [],
  podsById: {},
  isLoadingMine: false,
  updatingId: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'search/start':
      return { ...state, isSearching: true };
    case 'search/success':
      return { ...state, isSearching: false, results: action.results };
    case 'mine/start':
      return { ...state, isLoadingMine: true };
    case 'mine/success':
      return {
        ...state, isLoadingMine: false,
        memberships: action.memberships, requests: action.requests, invitations: action.invitations,
        podsById: { ...state.podsById, ...action.podsById },
      };
    case 'action/start':
      return { ...state, updatingId: action.id };
    case 'membership/updated':
      return {
        ...state, updatingId: null,
        memberships: state.memberships.map((m) => (m.id === action.membership.id ? action.membership : m)),
      };
    case 'request/created':
      return { ...state, updatingId: null, requests: [action.request, ...state.requests] };
    case 'request/updated':
      return {
        ...state, updatingId: null,
        requests: state.requests.map((r) => (r.id === action.request.id ? action.request : r)),
      };
    case 'invitation/updated':
      return {
        ...state, updatingId: null,
        invitations: state.invitations.map((i) => (i.id === action.invitation.id ? action.invitation : i)),
      };
    case 'error':
      return { ...state, isSearching: false, isLoadingMine: false, updatingId: null, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): PodsError {
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

interface PodsContextValue {
  state: State;
  search: (params?: ListPodsParams) => Promise<void>;
  loadMine: () => Promise<void>;
  respondToInvitation: (invitationId: string, decision: 'ACCEPT' | 'DECLINE') => Promise<void>;
  respondToMembership: (membershipId: string, decision: MembershipResponseDecision) => Promise<void>;
  leavePod: (membershipId: string) => Promise<void>;
  requestToJoin: (podId: string, reason?: string) => Promise<void>;
  proposeNewPod: (name: string, description: string, reason?: string) => Promise<void>;
  withdrawRequest: (requestId: string) => Promise<void>;
  clearError: () => void;
}

const PodsContext = createContext<PodsContextValue | null>(null);

/**
 * The standing Pods surface (PR-002) — Pods was previously a placeholder
 * with zero frontend despite being the largest backend domain (11
 * controllers). Scoped to the member-facing "Freedom of Belonging"
 * journey: discover Pods, request to join or propose a new one, respond
 * to invitations (including proactive Home Pod suggestions), and leave
 * freely ("Belonging shall never become imprisonment").
 */
export function PodsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const search = useCallback(
    async (params: ListPodsParams = {}) => {
      if (!session.accessToken) return;
      dispatch({ type: 'search/start' });
      try {
        const result = await listPods(session.accessToken, params);
        dispatch({ type: 'search/success', results: result.data });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadMine = useCallback(async () => {
    if (!session.accessToken) return;
    const accessToken = session.accessToken;
    dispatch({ type: 'mine/start' });
    try {
      const [memberships, requests, invitations] = await Promise.all([
        listMyMemberships(accessToken),
        listMyPodRequests(accessToken),
        listMyInvitations(accessToken),
      ]);

      const podIds = new Set<string>([
        ...memberships.map((m) => m.podId),
        ...requests.flatMap((r) => (r.podId ? [r.podId] : [])),
        ...invitations.map((i) => i.podId),
      ]);
      const pods = await Promise.all([...podIds].map((id) => getPod(accessToken, id)));
      const podsById = Object.fromEntries(pods.map((pod) => [pod.id, pod]));

      dispatch({ type: 'mine/success', memberships, requests, invitations, podsById });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const respondToInvitationAction = useCallback(
    async (invitationId: string, decision: 'ACCEPT' | 'DECLINE') => {
      if (!session.accessToken) return;
      dispatch({ type: 'action/start', id: invitationId });
      try {
        const invitation = await respondToInvitation(session.accessToken, invitationId, decision);
        dispatch({ type: 'invitation/updated', invitation });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const respondToMembershipAction = useCallback(
    async (membershipId: string, decision: MembershipResponseDecision) => {
      if (!session.accessToken) return;
      dispatch({ type: 'action/start', id: membershipId });
      try {
        const membership = await respondToMembership(session.accessToken, membershipId, decision);
        dispatch({ type: 'membership/updated', membership });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const leavePod = useCallback(
    async (membershipId: string) => {
      if (!session.accessToken) return;
      dispatch({ type: 'action/start', id: membershipId });
      try {
        const membership = await leaveMembership(session.accessToken, membershipId);
        dispatch({ type: 'membership/updated', membership });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const submitRequest = useCallback(
    async (input: CreateRequestInput) => {
      if (!session.accessToken) return;
      dispatch({ type: 'action/start', id: input.podId ?? 'new-pod' });
      try {
        const request = await createPodRequest(session.accessToken, input);
        dispatch({ type: 'request/created', request });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const requestToJoin = useCallback(
    (podId: string, reason?: string) => submitRequest({ type: 'JOIN', podId, reason }),
    [submitRequest],
  );

  const proposeNewPod = useCallback(
    (name: string, description: string, reason?: string) =>
      submitRequest({ type: 'PROPOSE_NEW_POD', proposedPodName: name, proposedPodDescription: description, reason }),
    [submitRequest],
  );

  const withdrawRequestAction = useCallback(
    async (requestId: string) => {
      if (!session.accessToken) return;
      dispatch({ type: 'action/start', id: requestId });
      try {
        const request = await withdrawPodRequest(session.accessToken, requestId);
        dispatch({ type: 'request/updated', request });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({
      state,
      search,
      loadMine,
      respondToInvitation: respondToInvitationAction,
      respondToMembership: respondToMembershipAction,
      leavePod,
      requestToJoin,
      proposeNewPod,
      withdrawRequest: withdrawRequestAction,
      clearError,
    }),
    [
      state, search, loadMine, respondToInvitationAction, respondToMembershipAction, leavePod,
      requestToJoin, proposeNewPod, withdrawRequestAction, clearError,
    ],
  );

  return <PodsContext.Provider value={value}>{children}</PodsContext.Provider>;
}

export function usePods(): PodsContextValue {
  const context = useContext(PodsContext);
  if (!context) {
    throw new Error('usePods must be used within a PodsProvider');
  }
  return context;
}
