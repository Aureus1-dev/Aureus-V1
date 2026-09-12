'use client';

import {
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

/**
 * Scoped to the authenticated member (Step 1 repair #3) — a shared browser
 * profile, or one member's session replacing another's, must never read or
 * write a different identity's remembered active company.
 */
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
      // A logout, or a switch to a different authenticated member, must
      // never let the previous identity's tenants, invitations, or active
      // selection remain visible/actionable during the next identity's
      // load (Step 1 repair #3) — this is a clean slate, not a soft clear.
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
  /** The full record for state.activeTenantId, or null while nothing is selected/loaded. */
  activeTenant: BusinessTenantSummary | null;
  refresh: () => Promise<void>;
  /** Switches the current Business context (Step 1 §6) and remembers the choice for this browser. */
  selectTenant: (tenantId: string) => void;
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  clearError: () => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

/**
 * Step 1 — Business Identity & Boundary. The smallest coherent record of
 * "which companies do I belong to, and which one am I currently working
 * inside" (§6 — context switching; §2 — a person may belong to multiple
 * organizations). A single source of truth for the active-tenant
 * selection so every business surface (console, knowledge, operations,
 * members) agrees on the same company instead of each independently
 * defaulting to whichever tenant its own fetch happens to return first.
 * Also carries the caller's own pending invitations (§8/§17 Flow C) so a
 * newly invited person can discover and act on them without first
 * knowing which company invited them.
 */
export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Mirrors session.accessToken on every render (synchronously, before any
  // effect runs) so an in-flight fetch issued for an older identity can
  // detect — after its await resolves — that a newer identity has since
  // superseded it, and discard its result instead of writing someone
  // else's data into the current identity's state (Step 1 repair #3).
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
        // A per-viewer convenience only — safe to fall back silently.
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

  useEffect(() => {
    // Always clear the previous identity's Business state first — whether
    // this is a straight logout (accessToken goes to null) or a switch to
    // a different authenticated member, the next identity's load must
    // start from a clean slate (Step 1 repair #3).
    dispatch({ type: 'identity/reset' });
    void refresh();
  }, [session.accessToken, refresh]);

  const selectTenant = useCallback(
    (tenantId: string) => {
      dispatch({ type: 'tenant/select', tenantId });
      try {
        window.localStorage.setItem(storageKeyFor(session.memberId), tenantId);
      } catch {
        // A per-viewer convenience only — safe to no-op.
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

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness(): BusinessContextValue {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
