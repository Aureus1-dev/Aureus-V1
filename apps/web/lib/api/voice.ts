import { apiRequest } from './http';
import type { MessageDto } from './conversations';

/**
 * DTO shapes mirror `apps/api/src/ai/voice/dto/*` exactly (FPB-009 §8),
 * matching the backend Conversation Timing Layer contract (ADR-017,
 * DOMAIN-002). Do not add fields the backend does not return.
 */
export type VoiceTurnEventType =
  | 'MEMBER_SPEECH_STARTED'
  | 'MEMBER_SPEECH_STOPPED'
  | 'MEMBER_TURN_FINALIZED'
  | 'STEWARD_RESPONSE_STARTED'
  | 'STEWARD_RESPONSE_COMPLETED'
  | 'STEWARD_RESPONSE_INTERRUPTED'
  | 'SILENCE_TIMEOUT';

export type VoiceMessageCompletionStatus = 'COMPLETE' | 'INTERRUPTED' | 'CANCELLED';
export type VoiceSessionEndReason =
  'MEMBER_ENDED' | 'TIMEOUT' | 'DURATION_LIMIT' | 'ERROR' | 'RECONNECT_SUPERSEDED';

export interface VoiceSessionDto {
  id: string;
  conversationId: string;
  clientSecret: string;
  expiresAt: string;
  model: string;
  voice: string;
  turnDetectionMode: string;
  provider: 'OPENAI' | 'GEMINI' | 'STUB';
  transport: 'openai-webrtc' | 'gemini-live-websocket' | 'stub';
  startedAt: string;
  endedAt: string | null;
}

export interface VoiceSessionStatusDto {
  id: string;
  conversationId: string;
  startedAt: string;
  endedAt: string | null;
  endReason: VoiceSessionEndReason | null;
}

export interface VoiceMessageEventInput {
  role: 'USER' | 'ASSISTANT';
  content: string;
  providerItemId: string;
  completionStatus?: VoiceMessageCompletionStatus;
}

export interface VoiceTurnEventInput {
  type: VoiceTurnEventType;
  providerItemId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Real cost tracking (ADR-017 follow-up) — the token usage OpenAI reports
 * on `response.done`, forwarded as-is since the backend has no other way
 * to see it (no backend audio proxy). `providerItemId` must be the same
 * id as the corresponding assistant message in this same sync call (or an
 * earlier one) so the backend can price a turn exactly once.
 */
export interface VoiceUsageEventInput {
  providerItemId: string;
  inputAudioTokens: number;
  inputTextTokens: number;
  cachedAudioTokens: number;
  cachedTextTokens: number;
  outputAudioTokens: number;
  outputTextTokens: number;
}

export interface SyncVoiceEventsInput {
  messages?: VoiceMessageEventInput[];
  turnEvents?: VoiceTurnEventInput[];
  usage?: VoiceUsageEventInput[];
}

export interface TurnEventDto {
  id: string;
  voiceSessionId: string;
  type: VoiceTurnEventType;
  providerItemId: string | null;
  occurredAt: string;
}

export interface SyncVoiceEventsResultDto {
  messages: MessageDto[];
  turnEvents: TurnEventDto[];
}

export function startVoiceSession(
  accessToken: string,
  conversationId?: string,
): Promise<VoiceSessionDto> {
  return apiRequest<VoiceSessionDto>('/ai/voice/sessions', {
    method: 'POST',
    accessToken,
    body: conversationId ? { conversationId } : {},
  });
}

export function syncVoiceEvents(
  accessToken: string,
  sessionId: string,
  input: SyncVoiceEventsInput,
): Promise<SyncVoiceEventsResultDto> {
  return apiRequest<SyncVoiceEventsResultDto>(`/ai/voice/sessions/${sessionId}/events`, {
    method: 'POST',
    accessToken,
    body: input,
  });
}

export function endVoiceSession(
  accessToken: string,
  sessionId: string,
): Promise<VoiceSessionStatusDto> {
  return apiRequest<VoiceSessionStatusDto>(`/ai/voice/sessions/${sessionId}/end`, {
    method: 'POST',
    accessToken,
  });
}
