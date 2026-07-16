import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import {
  IVoiceProvider,
  VoiceSessionBrokerInput,
  VoiceSessionBrokerOutput,
} from './voice-provider.interface';

const STUB_SESSION_TTL_MS = 10 * 60 * 1000;

/**
 * Safe default voice provider — used whenever OPENAI_API_KEY is not
 * configured (local development, CI, this implementation sandbox), mirroring
 * StubAiProvider. Issues a deterministic-shape fake credential so the whole
 * session-broker path (policy application, persistence, concurrency,
 * expiry) is exercised end-to-end with zero outbound network calls, zero
 * cost, and no real client secret ever produced.
 */
@Injectable()
export class StubVoiceProvider implements IVoiceProvider {
  readonly provider = AiProvider.STUB;
  private readonly logger = new Logger(StubVoiceProvider.name);

  async brokerSession(_input: VoiceSessionBrokerInput): Promise<VoiceSessionBrokerOutput> {
    this.logger.warn('OPENAI_API_KEY is not configured — returning a stub voice session credential, not calling any external provider.');

    return {
      clientSecret: `stub_secret_${randomUUID()}`,
      expiresAt: new Date(Date.now() + STUB_SESSION_TTL_MS),
      providerSessionRef: null,
    };
  }
}
