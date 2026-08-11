import type { NormalizedVoiceEvent } from './realtime-event-mapper';

export interface VoiceRealtimeClient {
  connect(clientSecret: string, model: string, voice?: string): Promise<void>;
  setMuted(muted: boolean): void;
  interrupt(): void;
  resolveToolCall(callId: string, output: Record<string, unknown>): void;
  syncInterfaceContext(summary: string): void;
  disconnect(): void;
}

export interface GeminiLiveClientCallbacks {
  onEvent: (event: NormalizedVoiceEvent) => void;
  onConnectionStateChange: (state: 'connected' | 'failed' | 'closed') => void;
}
