'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ListNotificationsParams,
  type NotificationDto,
} from '../../lib/api/notifications';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type NotificationsErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface NotificationsError {
  kind: NotificationsErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  notifications: NotificationDto[];
  isLoading: boolean;
  unreadCount: number | null;
  error: NotificationsError | null;
}

type Action =
  | { type: 'list/loading' }
  | { type: 'list/loaded'; notifications: NotificationDto[] }
  | { type: 'unread-count/loaded'; count: number }
  | { type: 'notification/updated'; notification: NotificationDto }
  | { type: 'all-read'; readAt: string }
  | { type: 'error'; error: NotificationsError }
  | { type: 'error/clear' };

const initialState: State = {
  notifications: [],
  isLoading: false,
  unreadCount: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'list/loading':
      return { ...state, isLoading: true };
    case 'list/loaded':
      return { ...state, isLoading: false, notifications: action.notifications };
    case 'unread-count/loaded':
      return { ...state, unreadCount: action.count };
    case 'notification/updated':
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.id === action.notification.id ? action.notification : n)),
      };
    case 'all-read':
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.readAt ? n : { ...n, readAt: action.readAt })),
        unreadCount: 0,
      };
    case 'error':
      return { ...state, isLoading: false, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): NotificationsError {
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

interface NotificationsContextValue {
  state: State;
  load: (params?: ListNotificationsParams) => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearError: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/**
 * Written to the full list/read/read-all backend contract (FPB-010 §7)
 * even though Home (DOMAIN-003) only consumes a preview of it — a future
 * Notifications Domain extends this context rather than replacing it.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(
    async (params: ListNotificationsParams = {}) => {
      if (!session.accessToken) return;
      dispatch({ type: 'list/loading' });
      try {
        const result = await listNotifications(session.accessToken, params);
        dispatch({ type: 'list/loaded', notifications: result.data });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadUnreadCount = useCallback(async () => {
    if (!session.accessToken) return;
    try {
      const result = await listNotifications(session.accessToken, { unreadOnly: true, limit: 1 });
      dispatch({ type: 'unread-count/loaded', count: result.total });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const markRead = useCallback(
    async (id: string) => {
      if (!session.accessToken) return;
      const wasUnread = !state.notifications.find((n) => n.id === id)?.readAt;
      try {
        const notification = await markNotificationRead(session.accessToken, id);
        dispatch({ type: 'notification/updated', notification });
        if (wasUnread && state.unreadCount !== null) {
          dispatch({ type: 'unread-count/loaded', count: Math.max(0, state.unreadCount - 1) });
        }
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken, state.notifications, state.unreadCount],
  );

  const markAllRead = useCallback(async () => {
    if (!session.accessToken) return;
    try {
      await markAllNotificationsRead(session.accessToken);
      dispatch({ type: 'all-read', readAt: new Date().toISOString() });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({ state, load, loadUnreadCount, markRead, markAllRead, clearError }),
    [state, load, loadUnreadCount, markRead, markAllRead, clearError],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
