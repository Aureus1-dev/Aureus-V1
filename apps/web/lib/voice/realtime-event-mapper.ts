/**
 * Translates OpenAI Realtime API data-channel events into the
 * domain-normalized events `VoiceContext` consumes. This is the only
 * module in the frontend that knows the provider's wire format — the
 * rest of the Voice Domain (state machine, components) works only in
 * terms of `NormalizedVoiceEvent`, so a future provider change is
 * contained to this file alone (mirrors the backend's IVoiceProvider
 * abstraction, ADR-017 Decision 8).
 *
 * The event names below (`response.done` status `cancelled`/`incomplete`,
 * etc.) map directly onto the backend's Conversation Timing Layer
 * vocabulary (`AiTurnEventType`, DOMAIN-002) — a member turn is only ever
 * reported as finalized once, from `conversation.item.input_audio_transcription.completed`,
 * never from a speech-stopped pause alone.
 */

export type NormalizedVoiceEvent =
  | { kind: 'member-speech-started'; occurredAt: string }
  | { kind: 'member-speech-stopped'; occurredAt: string }
  | { kind: 'member-turn-finalized'; itemId: string; transcript: string; occurredAt: string }
  | { kind: 'steward-response-started'; responseId: string; occurredAt: string }
  | { kind: 'steward-transcript-delta'; responseId: string; delta: string }
  | { kind: 'steward-response-completed'; responseId: string; itemId: string | null; transcript: string; occurredAt: string }
  | { kind: 'steward-response-interrupted'; responseId: string; itemId: string | null; transcript: string; occurredAt: string }
  | { kind: 'provider-error'; message: string };

export interface RawRealtimeEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * Holds minimal state only for what a single raw event doesn't carry on
 * its own: the steward's transcript, assembled from streamed deltas and
 * consumed once `response.done` arrives. Everything else is a direct,
 * stateless translation.
 */
export class RealtimeEventMapper {
  private readonly transcriptByResponseId = new Map<string, string>();
  private readonly now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  map(raw: RawRealtimeEvent): NormalizedVoiceEvent[] {
    switch (raw.type) {
      case 'input_audio_buffer.speech_started':
        return [{ kind: 'member-speech-started', occurredAt: this.nowIso() }];

      case 'input_audio_buffer.speech_stopped':
        return [{ kind: 'member-speech-stopped', occurredAt: this.nowIso() }];

      case 'conversation.item.input_audio_transcription.completed':
        return [{
          kind: 'member-turn-finalized',
          itemId: String(raw.item_id ?? ''),
          transcript: String(raw.transcript ?? ''),
          occurredAt: this.nowIso(),
        }];

      case 'response.created': {
        const responseId = extractResponseId(raw);
        if (!responseId) return [];
        this.transcriptByResponseId.set(responseId, '');
        return [{ kind: 'steward-response-started', responseId, occurredAt: this.nowIso() }];
      }

      case 'response.audio_transcript.delta': {
        const responseId = String(raw.response_id ?? '');
        const delta = String(raw.delta ?? '');
        if (!responseId) return [];
        const existing = this.transcriptByResponseId.get(responseId) ?? '';
        this.transcriptByResponseId.set(responseId, existing + delta);
        return [{ kind: 'steward-transcript-delta', responseId, delta }];
      }

      case 'response.audio_transcript.done': {
        const responseId = String(raw.response_id ?? '');
        const transcript = String(raw.transcript ?? '');
        if (responseId && transcript) {
          this.transcriptByResponseId.set(responseId, transcript);
        }
        return [];
      }

      case 'response.done': {
        const response = raw.response as { id?: string; status?: string; output?: { id?: string }[] } | undefined;
        const responseId = response?.id ?? '';
        if (!responseId) return [];

        const transcript = this.transcriptByResponseId.get(responseId) ?? '';
        const itemId = response?.output?.[0]?.id ?? null;
        this.transcriptByResponseId.delete(responseId);
        const occurredAt = this.nowIso();

        if (response?.status === 'cancelled' || response?.status === 'incomplete') {
          return [{ kind: 'steward-response-interrupted', responseId, itemId, transcript, occurredAt }];
        }
        return [{ kind: 'steward-response-completed', responseId, itemId, transcript, occurredAt }];
      }

      case 'error': {
        const error = raw.error as { message?: string } | undefined;
        return [{ kind: 'provider-error', message: error?.message ?? 'The voice connection reported an error.' }];
      }

      default:
        return [];
    }
  }

  reset(): void {
    this.transcriptByResponseId.clear();
  }

  private nowIso(): string {
    return this.now().toISOString();
  }
}

function extractResponseId(raw: RawRealtimeEvent): string | null {
  const response = raw.response as { id?: string } | undefined;
  return response?.id ?? null;
}
