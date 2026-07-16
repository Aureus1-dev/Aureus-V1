import { AiProvider as AiProviderEnum } from '@prisma/client';

export const VOICE_PROVIDER = 'VOICE_PROVIDER';

export interface VoiceSessionBrokerInput {
  model: string;
  voice: string;
  instructions: string;
  turnDetectionConfig: Record<string, unknown>;
}

export interface VoiceSessionBrokerOutput {
  clientSecret: string;
  expiresAt: Date;
  providerSessionRef: string | null;
}

/**
 * Realtime-voice provider abstraction, parallel to IAiProvider (ai-provider
 * .interface.ts) but not the same interface — brokering a short-lived
 * WebRTC credential is a different shape of call than a text completion,
 * and only OpenAI has a realtime voice product today (Founder Decision:
 * "Anthropic has no realtime voice equivalent"). Kept swappable by
 * provider anyway, mirroring ADR-015 Decision 1, so a future realtime
 * provider can be added by implementing this interface and extending the
 * factory in voice-provider.module.ts alone.
 */
export interface IVoiceProvider {
  readonly provider: AiProviderEnum;
  brokerSession(input: VoiceSessionBrokerInput): Promise<VoiceSessionBrokerOutput>;
}
