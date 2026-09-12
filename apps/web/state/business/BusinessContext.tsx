'use client';

import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { listMyBusinessTenants, type BusinessTenantSummary } from '../../lib/api/business-console';
import {
  acceptInvitation,
  declineInvitation,
  listMyInvitations,
  type OrganizationInvitation,
} from '../../lib/api/organizations';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

const ACTIVE_TENANT_STORAGE_KEY = 'aureus-active-business-tenant';

function storageKeyFor(memberId: string | null): string {
  return `${ACTIVE_TENANT_STORAGE_KEY}:${memberId ?? 'anonymous'}`;
}

export type BusinessErrorKind =
  'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface BusinessError {
  kind: BusinessErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  tenants: BusinessTenantSummary[];
  activeTenantId: string | null;
  invitations: OrganizationInvitation[];
  isLoading: boolean;
  updatingInvitationId: string | null;
  error: BusinessError | null;
}

type Action =
  | { type: 'load/start' }
  | {
      type: 'load/success';
      tenants: BusinessTenantSummary[];
      invitations: OrganizationInvitation[];
      activeTenantId: string | null;
    }
  | { type: 'tenant/select'; tenantId: string }
  | { type: 'invitation/start'; id: string }
  | { type: 'invitation/resolved'; id: string }
  | { type: 'error'; error: BusinessError }
  | { type: 'error/clear' }
  | { type: 'identity/reset' };

const initialState: State = {
  tenants: [],
  activeTenantId: null,
  invitations: [],
  isLoading: false,
  updatingInvitationId: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load/start':
      return { ...state, isLoading: true };
    case 'load/success':
      return {
        ...state,
        isLoading: false,
        tenants: action.tenants,
        invitations: action.invitations,
        activeTenantId: action.activeTenantId,
      };
    case 'tenant/select':
      return { ...state, activeTenantId: action.tenantId };
    case 'invitation/start':
      return { ...state, updatingInvitationId: action.id };
    case 'invitation/resolved':
      return {
        ...state,
        updatingInvitationId: null,
        invitations: state.invitations.filter((invitation) => invitation.id !== action.id),
      };
    case 'error':
      return { ...state, isLoading: false, updatingInvitationId: null, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    case 'identity/reset':
      return initialState;
    default:
      return state;
  }
}

function classifyError(error: unknown): BusinessError {
  if (error instanceof ApiError) {
    if (error.isAuthenticationRequired)
      return { kind: 'authentication', message: error.message, retryable: false };
    if (error.isRateLimited)
      return { kind: 'rate-limited', message: error.message, retryable: true };
    if (error.isServiceUnavailable)
      return { kind: 'unavailable', message: error.message, retryable: true };
    if (error.isValidationError)
      return { kind: 'validation', message: error.message, retryable: false };
    return { kind: 'unknown', message: error.message, retryable: error.retryable };
  }
  if (error instanceof NetworkError)
    return { kind: 'network', message: error.message, retryable: true };
  return { kind: 'unknown', message: 'Something unexpected happened.', retryable: true };
}

interface BusinessContextValue {
  state: State;
  activeTenant: BusinessTenantSummary | null;
  refresh: () => Promise<void>;
  selectTenant: (tenantId: string) => void;
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  clearError: () => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

/**
 * Step 1 — Business Identity & Boundary.
 *
 * This provider is both the source of truth for active company selection and
 * the workspace isolation boundary. Its child subtree is keyed by
 * authenticated member + active tenant. A person switch or Company A → B
 * switch therefore remounts every business surface in one place, discarding
 * tenant-local React state and preventing a slow completion from an old
 * workspace from repopulating the newly visible workspace.
 */
export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const accessTokenRef = useRef(session.accessToken);
  accessTokenRef.current = session.accessToken;

  const refresh = useCallback(async () => {
    if (!session.accessToken) return;
    const accessToken = session.accessToken;
    const memberId = session.memberId;
    dispatch({ type: 'load/start' });
    try {
      const [tenants, invitations] = await Promise.all([
        listMyBusinessTenants(accessToken),
        listMyInvitations(accessToken),
      ]);
      if (accessTokenRef.current !== accessToken) return;

      let storedId: string | null = null;
      try {
        storedId = window.localStorage.getItem(storageKeyFor(memberId));
      } catch {
        // Browser persistence is only a convenience.
      }
      const activeTenantId = tenants.some((tenant) => tenant.id === storedId)
        ? storedId
        : (tenants[0]?.id ?? null);

      dispatch({ type: 'load/success', tenants, invitations, activeTenantId });
    } catch (error) {
      if (accessTokenRef.current !== accessToken) return;
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken, session.memberId]);

  // Identity reset is keyed to the person, not token rotation. A refresh-token
  // exchange for the same member can refresh business data without blanking
  // the workspace; logout or account-switch still clears it immediately.
  useEffect(() => {
    dispatch({ type: 'identity/reset' });
  }, [session.memberId]);

  useEffect(() => {
    if (!session.accessToken) return;
    void refresh();
  }, [session.accessToken, refresh]);

  const selectTenant = useCallback(
    (tenantId: string) => {
      dispatch({ type: 'tenant/select', tenantId });
      try {
        window.localStorage.setItem(storageKeyFor(session.memberId), tenantId);
      } catch {
        // Browser persistence is only a convenience.
      }
    },
    [session.memberId],
  );

  const acceptInvitationAction = useCallback(
    async (invitationId: string) => {
      if (!session.accessToken) return;
      dispatch({ type: 'invitation/start', id: invitationId });
      try {
        await acceptInvitation(session.accessToken, invitationId);
        dispatch({ type: 'invitation/resolved', id: invitationId });
        await refresh();
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, refresh],
  );

  const declineInvitationAction = useCallback(
    async (invitationId: string) => {
      if (!session.accessToken) return;
      dispatch({ type: 'invitation/start', id: invitationId });
      try {
        await declineInvitation(session.accessToken, invitationId);
        dispatch({ type: 'invitation/resolved', id: invitationId });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const activeTenant = useMemo(
    () => state.tenants.find((tenant) => tenant.id === state.activeTenantId) ?? null,
    [state.tenants, state.activeTenantId],
  );

  const value = useMemo(
    () => ({
      state,
      activeTenant,
      refresh,
      selectTenant,
      acceptInvitation: acceptInvitationAction,
      declineInvitation: declineInvitationAction,
      clearError,
    }),
    [
      state,
      activeTenant,
      refresh,
      selectTenant,
      acceptInvitationAction,
      declineInvitationAction,
      clearError,
    ],
  );

  // This is the hard UI boundary for tenant-local component state. It is
  // deliberately based on identity + selected company, not access token.
  const workspaceEpoch = `${session.memberId ?? 'anonymous'}:${state.activeTenantId ?? 'none'}`;

  return (
    <BusinessContext.Provider value={value}>
      <Fragment key={workspaceEpoch}>{children}</Fragment>
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
