'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  getAiOperationalConfig,
  updateAiOperationalConfig,
  type AiOperationalConfigDto,
  type UpdateAiOperationalConfigInput,
} from '../../lib/api/ai-operational-config';
import {
  getAiSpendSummary,
  listAllAiRequests,
  type AiRequestDto,
  type AiSpendSummaryDto,
  type ListAiRequestsParams,
} from '../../lib/api/ai-requests';
import {
  getFounderMetrics,
  type AdministrationMetricsDto,
} from '../../lib/api/founder-metrics';
import {
  grantRole as grantRoleRequest,
  listUsers,
  revokeRole as revokeRoleRequest,
  updateUser as updateUserRequest,
  type ListUsersParams,
  type UpdateUserInput,
  type UserDto,
  type UserRole,
} from '../../lib/api/users';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type FounderErrorKind = 'authentication' | 'authorization' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface FounderError {
  kind: FounderErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  metrics: AdministrationMetricsDto | null;
  isLoadingMetrics: boolean;

  aiConfig: AiOperationalConfigDto | null;
  isLoadingAiConfig: boolean;
  isSavingAiConfig: boolean;

  aiRequests: AiRequestDto[];
  aiRequestsTotal: number | null;
  isLoadingAiRequests: boolean;

  aiSpend: AiSpendSummaryDto | null;
  isLoadingAiSpend: boolean;

  users: UserDto[];
  usersTotal: number | null;
  isLoadingUsers: boolean;
  updatingUserId: string | null;

  error: FounderError | null;
}

type Action =
  | { type: 'metrics/loading' }
  | { type: 'metrics/loaded'; metrics: AdministrationMetricsDto }
  | { type: 'ai-config/loading' }
  | { type: 'ai-config/loaded'; config: AiOperationalConfigDto }
  | { type: 'ai-config/saving' }
  | { type: 'ai-config/saved'; config: AiOperationalConfigDto }
  | { type: 'ai-requests/loading' }
  | { type: 'ai-requests/loaded'; requests: AiRequestDto[]; total: number }
  | { type: 'ai-spend/loading' }
  | { type: 'ai-spend/loaded'; spend: AiSpendSummaryDto }
  | { type: 'users/loading' }
  | { type: 'users/loaded'; users: UserDto[]; total: number }
  | { type: 'user/saving'; id: string }
  | { type: 'user/saved'; user: UserDto }
  | { type: 'error'; error: FounderError }
  | { type: 'error/clear' };

const initialState: State = {
  metrics: null,
  isLoadingMetrics: false,
  aiConfig: null,
  isLoadingAiConfig: false,
  isSavingAiConfig: false,
  aiRequests: [],
  aiRequestsTotal: null,
  isLoadingAiRequests: false,
  aiSpend: null,
  isLoadingAiSpend: false,
  users: [],
  usersTotal: null,
  isLoadingUsers: false,
  updatingUserId: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'metrics/loading':
      return { ...state, isLoadingMetrics: true };
    case 'metrics/loaded':
      return { ...state, isLoadingMetrics: false, metrics: action.metrics };
    case 'ai-config/loading':
      return { ...state, isLoadingAiConfig: true };
    case 'ai-config/loaded':
      return { ...state, isLoadingAiConfig: false, aiConfig: action.config };
    case 'ai-config/saving':
      return { ...state, isSavingAiConfig: true };
    case 'ai-config/saved':
      return { ...state, isSavingAiConfig: false, aiConfig: action.config };
    case 'ai-requests/loading':
      return { ...state, isLoadingAiRequests: true };
    case 'ai-requests/loaded':
      return { ...state, isLoadingAiRequests: false, aiRequests: action.requests, aiRequestsTotal: action.total };
    case 'ai-spend/loading':
      return { ...state, isLoadingAiSpend: true };
    case 'ai-spend/loaded':
      return { ...state, isLoadingAiSpend: false, aiSpend: action.spend };
    case 'users/loading':
      return { ...state, isLoadingUsers: true };
    case 'users/loaded':
      return { ...state, isLoadingUsers: false, users: action.users, usersTotal: action.total };
    case 'user/saving':
      return { ...state, updatingUserId: action.id };
    case 'user/saved':
      return {
        ...state,
        updatingUserId: null,
        users: state.users.map((u) => (u.id === action.user.id ? action.user : u)),
      };
    case 'error':
      return {
        ...state,
        isLoadingMetrics: false, isLoadingAiConfig: false, isSavingAiConfig: false,
        isLoadingAiRequests: false, isLoadingAiSpend: false, isLoadingUsers: false, updatingUserId: null,
        error: action.error,
      };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): FounderError {
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

interface FounderContextValue {
  state: State;
  loadMetrics: () => Promise<void>;
  loadAiConfig: () => Promise<void>;
  saveAiConfig: (input: UpdateAiOperationalConfigInput) => Promise<void>;
  loadAiRequests: (params?: ListAiRequestsParams) => Promise<void>;
  loadAiSpendSummary: () => Promise<void>;
  loadUsers: (params?: ListUsersParams) => Promise<void>;
  updateUser: (id: string, input: UpdateUserInput) => Promise<void>;
  grantRole: (userId: string, role: UserRole) => Promise<void>;
  revokeRole: (userId: string, role: UserRole) => Promise<void>;
  clearError: () => void;
}

const FounderContext = createContext<FounderContextValue | null>(null);

/**
 * The Founder Operating System's state layer (PR-003) — institutional
 * health metrics, live AI operational controls (config + platform-wide
 * audit/spend), and user & role management. Scoped deliberately: the
 * Review Queue, Stewardship Oversight, Announcements, and Governance
 * panels each own domain data that already has its own context
 * (or will), so this context stays focused on the three concerns above
 * rather than becoming a single grab-bag for every Founder surface.
 */
export function FounderProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadMetrics = useCallback(async () => {
    if (!session.accessToken) return;
    dispatch({ type: 'metrics/loading' });
    try {
      const metrics = await getFounderMetrics(session.accessToken);
      dispatch({ type: 'metrics/loaded', metrics });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const loadAiConfig = useCallback(async () => {
    if (!session.accessToken) return;
    dispatch({ type: 'ai-config/loading' });
    try {
      const config = await getAiOperationalConfig(session.accessToken);
      dispatch({ type: 'ai-config/loaded', config });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const saveAiConfig = useCallback(
    async (input: UpdateAiOperationalConfigInput) => {
      if (!session.accessToken) return;
      dispatch({ type: 'ai-config/saving' });
      try {
        const config = await updateAiOperationalConfig(session.accessToken, input);
        dispatch({ type: 'ai-config/saved', config });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadAiRequests = useCallback(
    async (params: ListAiRequestsParams = {}) => {
      if (!session.accessToken) return;
      dispatch({ type: 'ai-requests/loading' });
      try {
        const result = await listAllAiRequests(session.accessToken, params);
        dispatch({ type: 'ai-requests/loaded', requests: result.data, total: result.total });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadAiSpendSummary = useCallback(async () => {
    if (!session.accessToken) return;
    dispatch({ type: 'ai-spend/loading' });
    try {
      const spend = await getAiSpendSummary(session.accessToken);
      dispatch({ type: 'ai-spend/loaded', spend });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const loadUsers = useCallback(
    async (params: ListUsersParams = {}) => {
      if (!session.accessToken) return;
      dispatch({ type: 'users/loading' });
      try {
        const result = await listUsers(session.accessToken, params);
        dispatch({ type: 'users/loaded', users: result.data, total: result.total });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const updateUser = useCallback(
    async (id: string, input: UpdateUserInput) => {
      if (!session.accessToken) return;
      dispatch({ type: 'user/saving', id });
      try {
        const user = await updateUserRequest(session.accessToken, id, input);
        dispatch({ type: 'user/saved', user });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const grantRole = useCallback(
    async (userId: string, role: UserRole) => {
      if (!session.accessToken) return;
      dispatch({ type: 'user/saving', id: userId });
      try {
        const user = await grantRoleRequest(session.accessToken, userId, role);
        dispatch({ type: 'user/saved', user });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const revokeRole = useCallback(
    async (userId: string, role: UserRole) => {
      if (!session.accessToken) return;
      dispatch({ type: 'user/saving', id: userId });
      try {
        const user = await revokeRoleRequest(session.accessToken, userId, role);
        dispatch({ type: 'user/saved', user });
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
      loadMetrics,
      loadAiConfig,
      saveAiConfig,
      loadAiRequests,
      loadAiSpendSummary,
      loadUsers,
      updateUser,
      grantRole,
      revokeRole,
      clearError,
    }),
    [
      state, loadMetrics, loadAiConfig, saveAiConfig, loadAiRequests, loadAiSpendSummary,
      loadUsers, updateUser, grantRole, revokeRole, clearError,
    ],
  );

  return <FounderContext.Provider value={value}>{children}</FounderContext.Provider>;
}

export function useFounder(): FounderContextValue {
  const context = useContext(FounderContext);
  if (!context) {
    throw new Error('useFounder must be used within a FounderProvider');
  }
  return context;
}
