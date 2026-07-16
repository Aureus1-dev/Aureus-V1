import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import {
  IVoiceProvider,
  VoiceSessionBrokerInput,
  VoiceSessionBrokerOutput,
} from './voice-provider.interface';

interface OpenAiRealtimeSessionResponse {
  id: string;
  client_secret: { value: string; expires_at: number };
}

/**
 * Brokers a short-lived OpenAI Realtime client secret (Founder Decision 1:
 * "Do not expose the permanent OpenAI API key to the client" — the backend
 * holds OPENAI_API_KEY and exchanges it for a narrowly-scoped, expiring
 * credential; the browser never sees the permanent key). The browser then
 * connects directly to OpenAI over WebRTC with that credential — this
 * class's job ends at issuing it; no audio is proxied through this server.
 * Only ever instantiated when OPENAI_API_KEY is configured
 * (voice-provider.module.ts), matching OpenAiProvider's assumption.
 */
@Injectable()
export class OpenAiVoiceProvider implements IVoiceProvider {
  readonly provider = AiProvider.OPENAI;
  private readonly logger = new Logger(OpenAiVoiceProvider.name);

  constructor(private readonly config: ConfigService) {}

  async brokerSession(input: VoiceSessionBrokerInput): Promise<VoiceSessionBrokerOutput> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');

    const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: input.model,
        voice: input.voice,
        instructions: input.instructions,
        turn_detection: input.turnDetectionConfig,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`OpenAI realtime session broker failed (${res.status}): ${body}`);
      throw new Error(`OpenAI realtime session broker failed with status ${res.status}`);
    }

    const data = (await res.json()) as OpenAiRealtimeSessionResponse;
    return {
      clientSecret: data.client_secret.value,
      expiresAt: new Date(data.client_secret.expires_at * 1000),
      providerSessionRef: data.id ?? null,
    };
  }
}
