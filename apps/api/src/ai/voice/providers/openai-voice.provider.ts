import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import {
  IVoiceProvider,
  VoiceSessionBrokerInput,
  VoiceSessionBrokerOutput,
} from './voice-provider.interface';

interface OpenAiRealtimeClientSecretResponse {
  value: string;
  expires_at: number;
  session?: { id?: string };
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
 *
 * Targets the GA `/v1/realtime/client_secrets` endpoint (the beta
 * `/v1/realtime/sessions` shape — flat `model`/`voice`/`turn_detection` at
 * the request's top level, `{id, client_secret: {...}}` in the response —
 * is deprecated). GA nests everything the beta sent flat under a `session`
 * object, and moves `voice`/`turn_detection` under `session.audio.output`/
 * `session.audio.input` respectively; the client secret itself is now the
 * top-level `value`/`expires_at`, with the echoed session's own id (if
 * present) available at `session.id`.
 */
@Injectable()
export class OpenAiVoiceProvider implements IVoiceProvider {
  readonly provider = AiProvider.OPENAI;
  private readonly logger = new Logger(OpenAiVoiceProvider.name);

  constructor(private readonly config: ConfigService) {}

  async brokerSession(input: VoiceSessionBrokerInput): Promise<VoiceSessionBrokerOutput> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');

    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: input.model,
          instructions: input.instructions,
          audio: {
            input: { turn_detection: input.turnDetectionConfig },
            output: { voice: input.voice },
          },
          tools: input.tools,
          tool_choice: 'auto',
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`OpenAI realtime session broker failed (${res.status}): ${body}`);
      throw new Error(`OpenAI realtime session broker failed with status ${res.status}`);
    }

    const data = (await res.json()) as OpenAiRealtimeClientSecretResponse;
    return {
      clientSecret: data.value,
      expiresAt: new Date(data.expires_at * 1000),
      providerSessionRef: data.session?.id ?? null,
    };
  }
}
