import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import { MEMBER_STEWARD_VOICE_SYSTEM_PROMPT } from '../../prompts/member-steward-system-prompt';
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
 * Brokers a short-lived OpenAI Realtime client secret. The browser receives
 * only the expiring credential and connects directly over WebRTC; the
 * permanent API key remains server-side.
 *
 * Voice uses the same real-life Member Steward scope as text. The legacy
 * caller-supplied instruction still exists for compatibility, but it is not
 * allowed to reintroduce the old platform-helpdesk boundary that rejected
 * ordinary member needs such as money, rent, food, or work.
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
          instructions: MEMBER_STEWARD_VOICE_SYSTEM_PROMPT,
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
