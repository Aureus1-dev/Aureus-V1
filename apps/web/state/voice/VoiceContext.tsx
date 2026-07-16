'use client';

import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState } from 'react';
import {
  startVoiceSession,
  syncVoiceEvents,
  endVoiceSession,
  type VoiceMessageEventInput,
  type VoiceTurnEventInput,
} from '../../lib/api/voice';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { VoiceWebRtcClient } from '../../lib/voice/webrtc-client';
import { RealtimeEventMapper, type NormalizedVoiceEvent } from '../../lib/voice/realtime-event-mapper';
import { useSession } from '../session/SessionContext';

export type VoiceTurnState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'ended';

export type VoiceErrorKind = 'authentication' | 'permission-denied' | 'connection' | 'unavailable' | 'network' | 'unknown';

export interface VoiceError {
  kind: VoiceErrorKind;
  message: string;
  retryable: boolean;
}

export interface VoiceTranscriptEntry {
  id: string;
  role: 'member' | 'steward';
  content: string;
  status: 'streaming' | 'final' | 'interrupted';
  createdAt: string;
}

interface State {
  turnState: VoiceTurnState;
  sessionId: string | null;
  conversationId: string | null;
  muted: boolean;
  transcript: VoiceTranscriptEntry[];
  error: VoiceError | null;
}

type Action =
  | { type: 'session/connecting' }
  | { type: 'session/connected'; sessionId: string; conversationId: string }
  | { type: 'session/ended' }
  | { type: 'error/set'; error: VoiceError }
  | { type: 'error/clear' }
  | { type: 'mute/set'; muted: boolean }
  | { type: 'transcript/member-started' }
  | { type: 'transcript/member-finalized'; itemId: string; transcript: string }
  | { type: 'transcript/steward-started'; responseId: string }
  | { type: 'transcript/steward-delta'; responseId: string; delta: string }
  | { type: 'transcript/steward-resolved'; responseId: string; transcript: string; interrupted: boolean }
  | { type: 'reset' };

const initialState: State = {
  turnState: 'idle',
  sessionId: null,
  conversationId: null,
  muted: false,
  transcript: [],
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'session/connecting':
      return { ...initialState, turnState: 'connecting' };
    case 'session/connected':
      return { ...state, turnState: 'listening', sessionId: action.sessionId, conversationId: action.conversationId, error: null };
    case 'session/ended':
      return { ...initialState, turnState: 'ended' };
    case 'error/set':
      return { ...state, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    case 'mute/set':
      return { ...state, muted: action.muted };
    case 'transcript/member-started':
      // A pause is never treated as a finished thought (AFX-003 §4) — state
      // only ever advances to 'listening' here, never further, until the
      // steward actually begins a response.
      return { ...state, turnState: 'listening' };
    case 'transcript/member-finalized':
      return {
        ...state,
        transcript: [
          ...state.transcript,
          { id: action.itemId, role: 'member', content: action.transcript, status: 'final', createdAt: new Date().toISOString() },
        ],
      };
    case 'transcript/steward-started':
      return {
        ...state,
        turnState: 'thinking',
        transcript: [
          ...state.transcript,
          { id: action.responseId, role: 'steward', content: '', status: 'streaming', createdAt: new Date().toISOString() },
        ],
      };
    case 'transcript/steward-delta':
      return {
        ...state,
        turnState: 'speaking',
        transcript: state.transcript.map((entry) =>
          entry.id === action.responseId && entry.status === 'streaming'
            ? { ...entry, content: entry.content + action.delta }
            : entry,
        ),
      };
    case 'transcript/steward-resolved':
      return {
        ...state,
        turnState: 'listening',
        transcript: state.transcript.map((entry) =>
          entry.id === action.responseId
            ? { ...entry, content: action.transcript || entry.content, status: action.interrupted ? 'interrupted' : 'final' }
            : entry,
        ),
      };
    case 'reset':
      return initialState;
    default:
      return state;
  }
}

function classifyError(error: unknown): VoiceError {
  if (error instanceof ApiError) {
    if (error.isAuthenticationRequired) {
      return { kind: 'authentication', message: error.message, retryable: false };
    }
    if (error.isServiceUnavailable) {
      return { kind: 'unavailable', message: error.message, retryable: true };
    }
    return { kind: 'unknown', message: error.message, retryable: error.retryable };
  }
  if (error instanceof NetworkError) {
    return { kind: 'network', message: error.message, retryable: true };
  }
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
    return { kind: 'permission-denied', message: 'Microphone access was not granted.', retryable: true };
  }
  return { kind: 'connection', message: 'The voice connection could not be established.', retryable: true };
}

interface PendingSync {
  turnEvents: VoiceTurnEventInput[];
  messages: VoiceMessageEventInput[];
}

function emptyPending(): PendingSync {
  return { turnEvents: [], messages: [] };
}

interface VoiceContextValue {
  state: State;
  remoteStream: MediaStream | null;
  startSession: (conversationId?: string) => Promise<void>;
  endSession: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  interrupt: () => void;
  clearError: () => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const clientRef = useRef<VoiceWebRtcClient | null>(null);
  const mapperRef = useRef(new RealtimeEventMapper());
  const sessionIdRef = useRef<string | null>(null);
  const pendingRef = useRef<PendingSync>(emptyPending());

  const flush = useCallback(async () => {
    const accessToken = session.accessToken;
    const sessionId = sessionIdRef.current;
    const pending = pendingRef.current;
    if (!accessToken || !sessionId || (pending.turnEvents.length === 0 && pending.messages.length === 0)) {
      return;
    }
    pendingRef.current = emptyPending();
    try {
      await syncVoiceEvents(accessToken, sessionId, pending);
    } catch {
      // Best-effort evidence sync — a transient failure here does not tear
      // down a live conversation. The member turn simply won't have
      // persisted if its finalize event was in this batch; nothing in the
      // live UI depends on this call succeeding synchronously.
    }
  }, [session.accessToken]);

  const handleNormalizedEvent = useCallback(
    (event: NormalizedVoiceEvent) => {
      switch (event.kind) {
        case 'member-speech-started':
          pendingRef.current.turnEvents.push({ type: 'MEMBER_SPEECH_STARTED', occurredAt: event.occurredAt });
          dispatch({ type: 'transcript/member-started' });
          break;
        case 'member-speech-stopped':
          pendingRef.current.turnEvents.push({ type: 'MEMBER_SPEECH_STOPPED', occurredAt: event.occurredAt });
          break;
        case 'member-turn-finalized':
          pendingRef.current.turnEvents.push({
            type: 'MEMBER_TURN_FINALIZED', providerItemId: event.itemId, occurredAt: event.occurredAt,
          });
          pendingRef.current.messages.push({ role: 'USER', content: event.transcript, providerItemId: event.itemId });
          dispatch({ type: 'transcript/member-finalized', itemId: event.itemId, transcript: event.transcript });
          void flush();
          break;
        case 'steward-response-started':
          pendingRef.current.turnEvents.push({ type: 'STEWARD_RESPONSE_STARTED', providerItemId: event.responseId, occurredAt: event.occurredAt });
          dispatch({ type: 'transcript/steward-started', responseId: event.responseId });
          break;
        case 'steward-transcript-delta':
          dispatch({ type: 'transcript/steward-delta', responseId: event.responseId, delta: event.delta });
          break;
        case 'steward-response-completed': {
          const providerItemId = event.itemId ?? event.responseId;
          pendingRef.current.turnEvents.push({ type: 'STEWARD_RESPONSE_COMPLETED', providerItemId, occurredAt: event.occurredAt });
          pendingRef.current.messages.push({
            role: 'ASSISTANT', content: event.transcript, providerItemId, completionStatus: 'COMPLETE',
          });
          dispatch({ type: 'transcript/steward-resolved', responseId: event.responseId, transcript: event.transcript, interrupted: false });
          void flush();
          break;
        }
        case 'steward-response-interrupted': {
          const providerItemId = event.itemId ?? event.responseId;
          pendingRef.current.turnEvents.push({ type: 'STEWARD_RESPONSE_INTERRUPTED', providerItemId, occurredAt: event.occurredAt });
          pendingRef.current.messages.push({
            role: 'ASSISTANT', content: event.transcript, providerItemId, completionStatus: 'INTERRUPTED',
          });
          dispatch({ type: 'transcript/steward-resolved', responseId: event.responseId, transcript: event.transcript, interrupted: true });
          void flush();
          break;
        }
        case 'provider-error':
          dispatch({ type: 'error/set', error: { kind: 'connection', message: event.message, retryable: true } });
          break;
        default:
          break;
      }
    },
    [flush],
  );

  const teardown = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    mapperRef.current.reset();
    sessionIdRef.current = null;
    pendingRef.current = emptyPending();
    setRemoteStream(null);
  }, []);

  const startSession = useCallback(
    async (conversationId?: string) => {
      if (!session.accessToken) {
        dispatch({ type: 'error/set', error: classifyError(new ApiError(401, 'Sign in required')) });
        return;
      }
      dispatch({ type: 'session/connecting' });
      try {
        const voiceSession = await startVoiceSession(session.accessToken, conversationId);
        sessionIdRef.current = voiceSession.id;

        const client = new VoiceWebRtcClient({
          onRemoteTrack: (stream) => setRemoteStream(stream),
          onDataChannelMessage: (raw) => {
            for (const normalized of mapperRef.current.map(raw)) {
              handleNormalizedEvent(normalized);
            }
          },
          onConnectionStateChange: (connectionState) => {
            if (connectionState === 'failed' || connectionState === 'closed') {
              dispatch({ type: 'error/set', error: { kind: 'connection', message: 'The voice connection was lost.', retryable: true } });
            }
          },
        });
        clientRef.current = client;

        await client.connect(voiceSession.clientSecret, voiceSession.model);
        dispatch({ type: 'session/connected', sessionId: voiceSession.id, conversationId: voiceSession.conversationId });
      } catch (error) {
        teardown();
        dispatch({ type: 'error/set', error: classifyError(error) });
      }
    },
    [session.accessToken, handleNormalizedEvent, teardown],
  );

  const endSession = useCallback(async () => {
    await flush();
    const accessToken = session.accessToken;
    const sessionId = sessionIdRef.current;
    teardown();
    dispatch({ type: 'session/ended' });
    if (accessToken && sessionId) {
      try {
        await endVoiceSession(accessToken, sessionId);
      } catch {
        // The session is already torn down client-side; a failed end-call
        // is not member-visible and the backend's own duration limit is
        // the authoritative fallback for a session left dangling.
      }
    }
  }, [session.accessToken, flush, teardown]);

  const setMuted = useCallback((muted: boolean) => {
    clientRef.current?.setMuted(muted);
    dispatch({ type: 'mute/set', muted });
  }, []);

  const interrupt = useCallback(() => {
    clientRef.current?.interrupt();
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'error/clear' });
  }, []);

  const value = useMemo(
    () => ({ state, remoteStream, startSession, endSession, setMuted, interrupt, clearError }),
    [state, remoteStream, startSession, endSession, setMuted, interrupt, clearError],
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice(): VoiceContextValue {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
