'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  createConversation,
  listConversations,
  listMessages,
  sendMessage as sendMessageRequest,
  type ConversationDto,
  type MessageDto,
} from '../../lib/api/conversations';
import type { PendingToolCall } from '../voice/VoiceContext';

export type { PendingToolCall };
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type ConversationErrorKind =
  | 'authentication'
  | 'rate-limited'
  | 'unavailable'
  | 'validation'
  | 'network'
  | 'unknown';

export interface ConversationError {
  kind: ConversationErrorKind;
  message: string;
  retryable: boolean;
}

interface ConversationsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface State {
  conversations: ConversationDto[];
  conversationsMeta: ConversationsMeta | null;
  isLoadingConversations: boolean;
  activeConversationId: string | null;
  messagesByConversation: Record<string, MessageDto[]>;
  isLoadingMessages: boolean;
  /** Optimistic member message (and, once resolved, the steward reply) not yet committed to `messagesByConversation` — cleared on success or failure. */
  pendingMessages: MessageDto[];
  pendingResponse: boolean;
  draft: string;
  /** Interface actions the steward requested in its most recent reply — replaced (not accumulated) on every response, cleared once none remain. */
  pendingToolCalls: PendingToolCall[];
  error: ConversationError | null;
}

type Action =
  | { type: 'conversations/loading' }
  | { type: 'conversations/loaded'; conversations: ConversationDto[]; meta: ConversationsMeta }
  | { type: 'conversation/select'; id: string | null }
  | { type: 'messages/loading' }
  | { type: 'messages/loaded'; conversationId: string; messages: MessageDto[] }
  | { type: 'draft/set'; value: string }
  | { type: 'send/start'; optimisticMessage: MessageDto }
  | {
      type: 'send/success';
      conversationId: string;
      conversation: ConversationDto | null;
      assistantMessage: MessageDto;
    }
  | { type: 'send/failure'; error: ConversationError; restoreDraft: string }
  | { type: 'error/clear' };

const initialState: State = {
  conversations: [],
  conversationsMeta: null,
  isLoadingConversations: false,
  activeConversationId: null,
  messagesByConversation: {},
  isLoadingMessages: false,
  pendingMessages: [],
  pendingResponse: false,
  draft: '',
  pendingToolCalls: [],
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'conversations/loading':
      return { ...state, isLoadingConversations: true };
    case 'conversations/loaded':
      return {
        ...state,
        isLoadingConversations: false,
        conversations: action.conversations,
        conversationsMeta: action.meta,
      };
    case 'conversation/select':
      return { ...state, activeConversationId: action.id, error: null };
    case 'messages/loading':
      return { ...state, isLoadingMessages: true };
    case 'messages/loaded':
      return {
        ...state,
        isLoadingMessages: false,
        messagesByConversation: {
          ...state.messagesByConversation,
          [action.conversationId]: action.messages,
        },
      };
    case 'draft/set':
      return { ...state, draft: action.value };
    case 'send/start':
      return {
        ...state,
        pendingResponse: true,
        pendingMessages: [action.optimisticMessage],
        draft: '',
        error: null,
      };
    case 'send/success': {
      const existing = state.messagesByConversation[action.conversationId] ?? [];
      const optimisticUserMessage = state.pendingMessages[0]
        ? { ...state.pendingMessages[0], conversationId: action.conversationId }
        : null;
      const resolvedMessages = optimisticUserMessage
        ? [...existing, optimisticUserMessage, action.assistantMessage]
        : [...existing, action.assistantMessage];
      return {
        ...state,
        pendingResponse: false,
        pendingMessages: [],
        activeConversationId: action.conversationId,
        conversations: action.conversation
          ? mergeConversation(state.conversations, action.conversation)
          : state.conversations,
        messagesByConversation: {
          ...state.messagesByConversation,
          [action.conversationId]: resolvedMessages,
        },
        pendingToolCalls:
          action.assistantMessage.toolCalls?.map((tc) => ({ callId: tc.id, name: tc.name, arguments: tc.arguments })) ?? [],
      };
    }
    case 'send/failure':
      return {
        ...state,
        pendingResponse: false,
        pendingMessages: [],
        draft: action.restoreDraft,
        error: action.error,
      };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function mergeConversation(conversations: ConversationDto[], conversation: ConversationDto): ConversationDto[] {
  if (conversations.some((c) => c.id === conversation.id)) {
    return conversations;
  }
  return [conversation, ...conversations];
}

function classifyError(error: unknown): ConversationError {
  if (error instanceof ApiError) {
    if (error.isAuthenticationRequired) {
      return { kind: 'authentication', message: error.message, retryable: false };
    }
    if (error.isRateLimited) {
      return { kind: 'rate-limited', message: error.message, retryable: true };
    }
    if (error.isServiceUnavailable) {
      return { kind: 'unavailable', message: error.message, retryable: true };
    }
    if (error.isValidationError) {
      return { kind: 'validation', message: error.message, retryable: false };
    }
    return { kind: 'unknown', message: error.message, retryable: error.retryable };
  }
  if (error instanceof NetworkError) {
    return { kind: 'network', message: error.message, retryable: true };
  }
  return { kind: 'unknown', message: 'Something unexpected happened.', retryable: true };
}

interface ConversationContextValue {
  state: State;
  timeline: MessageDto[];
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  refreshMessages: (id: string) => Promise<void>;
  startNewConversation: () => void;
  setDraft: (value: string) => void;
  sendMessage: (interfaceContext?: string, explicitContent?: string) => Promise<void>;
  clearError: () => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadConversations = useCallback(async () => {
    if (!session.accessToken) {
      dispatch({ type: 'send/failure', error: classifyError(new ApiError(401, 'Sign in required')), restoreDraft: state.draft });
      return;
    }
    dispatch({ type: 'conversations/loading' });
    try {
      const result = await listConversations(session.accessToken);
      dispatch({
        type: 'conversations/loaded',
        conversations: result.data,
        meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
      });
    } catch (error) {
      dispatch({ type: 'send/failure', error: classifyError(error), restoreDraft: state.draft });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken]);

  const selectConversation = useCallback(
    async (id: string) => {
      dispatch({ type: 'conversation/select', id });
      if (!session.accessToken || state.messagesByConversation[id]) {
        return;
      }
      dispatch({ type: 'messages/loading' });
      try {
        const messages = await listMessages(session.accessToken, id);
        dispatch({ type: 'messages/loaded', conversationId: id, messages });
      } catch (error) {
        dispatch({ type: 'send/failure', error: classifyError(error), restoreDraft: state.draft });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.accessToken, state.messagesByConversation],
  );

  const startNewConversation = useCallback(() => {
    dispatch({ type: 'conversation/select', id: null });
  }, []);

  /**
   * Unlike `selectConversation`, always refetches regardless of cache —
   * used after a voice session ends so the text surface reflects
   * voice-sourced messages synced directly to the backend, which this
   * context's own cache has no way to know about on its own (text ↔ voice
   * continuity, DOMAIN-003).
   */
  const refreshMessages = useCallback(
    async (id: string) => {
      if (!session.accessToken) {
        return;
      }
      dispatch({ type: 'messages/loading' });
      try {
        const messages = await listMessages(session.accessToken, id);
        dispatch({ type: 'messages/loaded', conversationId: id, messages });
      } catch (error) {
        dispatch({ type: 'send/failure', error: classifyError(error), restoreDraft: state.draft });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.accessToken],
  );

  const setDraft = useCallback((value: string) => {
    dispatch({ type: 'draft/set', value });
  }, []);

  const sendMessage = useCallback(async (interfaceContext?: string, explicitContent?: string) => {
    // `explicitContent` lets a caller that already has the text in hand
    // (the Global Action Palette's "Ask your Steward" entry) send it in
    // the same handler as setting the draft, without racing the draft
    // state update — `state.draft` here reflects the last completed
    // render, not a `setDraft` call earlier in this same synchronous tick.
    const content = (explicitContent ?? state.draft).trim();
    if (!content || state.pendingResponse) {
      return;
    }
    if (!session.accessToken) {
      dispatch({ type: 'send/failure', error: classifyError(new ApiError(401, 'Sign in required')), restoreDraft: content });
      return;
    }

    const optimisticMessage: MessageDto = {
      id: `pending-${Date.now()}`,
      conversationId: state.activeConversationId ?? '',
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'send/start', optimisticMessage });

    try {
      let conversationId = state.activeConversationId;
      let conversation: ConversationDto | null = null;
      if (!conversationId) {
        conversation = await createConversation(session.accessToken);
        conversationId = conversation.id;
      }
      const assistantMessage = await sendMessageRequest(session.accessToken, conversationId, content, interfaceContext);
      dispatch({ type: 'send/success', conversationId, conversation, assistantMessage });
    } catch (error) {
      dispatch({ type: 'send/failure', error: classifyError(error), restoreDraft: content });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken, state.draft, state.pendingResponse, state.activeConversationId]);

  const clearError = useCallback(() => {
    dispatch({ type: 'error/clear' });
  }, []);

  const timeline = useMemo(() => {
    const committed = state.activeConversationId
      ? (state.messagesByConversation[state.activeConversationId] ?? [])
      : [];
    return [...committed, ...state.pendingMessages];
  }, [state.activeConversationId, state.messagesByConversation, state.pendingMessages]);

  const value = useMemo(
    () => ({
      state,
      timeline,
      loadConversations,
      selectConversation,
      refreshMessages,
      startNewConversation,
      setDraft,
      sendMessage,
      clearError,
    }),
    [state, timeline, loadConversations, selectConversation, refreshMessages, startNewConversation, setDraft, sendMessage, clearError],
  );

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

export function useConversation(): ConversationContextValue {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}
