'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  type ConversationDto,
  type MessageDto,
} from '../../lib/api/messages';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type MessagesErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface MessagesError {
  kind: MessagesErrorKind;
  message: string;
  retryable: boolean;
}

interface State {
  conversations: ConversationDto[];
  isLoadingConversations: boolean;
  messagesByConversationId: Record<string, MessageDto[]>;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: MessagesError | null;
}

type Action =
  | { type: 'conversations/loading' }
  | { type: 'conversations/loaded'; conversations: ConversationDto[] }
  | { type: 'conversation/updated'; conversation: ConversationDto }
  | { type: 'messages/loading' }
  | { type: 'messages/loaded'; conversationId: string; messages: MessageDto[] }
  | { type: 'message/sending' }
  | { type: 'message/sent'; conversationId: string; message: MessageDto }
  | { type: 'error'; error: MessagesError }
  | { type: 'error/clear' };

const initialState: State = {
  conversations: [],
  isLoadingConversations: false,
  messagesByConversationId: {},
  isLoadingMessages: false,
  isSending: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'conversations/loading':
      return { ...state, isLoadingConversations: true };
    case 'conversations/loaded':
      return { ...state, isLoadingConversations: false, conversations: action.conversations };
    case 'conversation/updated':
      return {
        ...state,
        conversations: state.conversations.map((c) => (c.id === action.conversation.id ? action.conversation : c)),
      };
    case 'messages/loading':
      return { ...state, isLoadingMessages: true };
    case 'messages/loaded':
      return {
        ...state, isLoadingMessages: false,
        messagesByConversationId: { ...state.messagesByConversationId, [action.conversationId]: action.messages },
      };
    case 'message/sending':
      return { ...state, isSending: true };
    case 'message/sent': {
      const existing = state.messagesByConversationId[action.conversationId] ?? [];
      return {
        ...state, isSending: false,
        messagesByConversationId: { ...state.messagesByConversationId, [action.conversationId]: [...existing, action.message] },
      };
    }
    case 'error':
      return { ...state, isLoadingConversations: false, isLoadingMessages: false, isSending: false, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): MessagesError {
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

interface MessagesContextValue {
  state: State;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  send: (conversationId: string, body: string) => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
  clearError: () => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

/**
 * The standing Messages surface (PR-002) — the human-to-human
 * conversation thread the Communication System's Messaging sub-domain
 * has supported since WO-026, never surfaced to a member until now.
 * Scoped to existing conversations (list/read/send/mark-read); starting
 * a new one is entry-pointed from the Stewardship relationship view or
 * the Organization representative directory, neither of which has a
 * frontend surface yet — a documented follow-up, not an oversight here.
 */
export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadConversations = useCallback(async () => {
    if (!session.accessToken) return;
    dispatch({ type: 'conversations/loading' });
    try {
      const result = await listConversations(session.accessToken);
      dispatch({ type: 'conversations/loaded', conversations: result.data });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!session.accessToken) return;
      dispatch({ type: 'messages/loading' });
      try {
        const result = await listMessages(session.accessToken, conversationId, { limit: 100 });
        dispatch({ type: 'messages/loaded', conversationId, messages: result.data });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const send = useCallback(
    async (conversationId: string, body: string) => {
      if (!session.accessToken) return;
      dispatch({ type: 'message/sending' });
      try {
        const message = await sendMessage(session.accessToken, conversationId, body);
        dispatch({ type: 'message/sent', conversationId, message });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const markRead = useCallback(
    async (conversationId: string) => {
      if (!session.accessToken) return;
      try {
        await markConversationRead(session.accessToken, conversationId);
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({ state, loadConversations, loadMessages, send, markRead, clearError }),
    [state, loadConversations, loadMessages, send, markRead, clearError],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages(): MessagesContextValue {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}
