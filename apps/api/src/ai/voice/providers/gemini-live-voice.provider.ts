import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import {
  IVoiceProvider,
  VoiceSessionBrokerInput,
  VoiceSessionBrokerOutput,
} from './voice-provider.interface';

interface GeminiAuthTokenResponse {
  name?: string;
  expireTime?: string;
}

/**
 * Brokers a one-use, short-lived token for the Gemini Live WebSocket API.
 * The permanent GEMINI_API_KEY never leaves the API service. The token is
 * constrained server-side to the selected model, audio output, Aureus's
 * system instructions, transcription, and the fixed interface tool set.
 */
@Injectable()
export class GeminiLiveVoiceProvider implements IVoiceProvider {
  readonly provider = AiProvider.GEMINI;
  readonly transport = 'gemini-live-websocket' as const;
  readonly defaultModel = 'gemini-3.1-flash-live-preview';
  readonly defaultVoice = 'Kore';
  private readonly logger = new Logger(GeminiLiveVoiceProvider.name);

  constructor(private readonly config: ConfigService) {}

  async brokerSession(input: VoiceSessionBrokerInput): Promise<VoiceSessionBrokerOutput> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const newSessionExpiresAt = new Date(Date.now() + 60 * 1000);
    const functionDeclarations = input.tools
      .filter((tool) => tool.type === 'function')
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));

    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey ?? '',
      },
      body: JSON.stringify({
        uses: 1,
        expireTime: expiresAt.toISOString(),
        newSessionExpireTime: newSessionExpiresAt.toISOString(),
        liveConnectConstraints: {
          model: `models/${input.model}`,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: input.voice } } },
            systemInstruction: { parts: [{ text: input.instructions }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            sessionResumption: {},
            contextWindowCompression: { slidingWindow: {} },
            tools: functionDeclarations.length ? [{ functionDeclarations }] : [],
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Gemini Live token broker failed (${res.status}): ${body}`);
      throw new Error(`Gemini Live token broker failed with status ${res.status}`);
    }

    const data = (await res.json()) as GeminiAuthTokenResponse;
    if (!data.name) throw new Error('Gemini Live token broker returned no ephemeral token');
    return {
      clientSecret: data.name,
      expiresAt: data.expireTime ? new Date(data.expireTime) : expiresAt,
      providerSessionRef: null,
    };
  }
}
