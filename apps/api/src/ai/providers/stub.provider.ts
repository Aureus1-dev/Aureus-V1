import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import { AiCompletionInput, AiCompletionOutput, IAiProvider } from './ai-provider.interface';

/**
 * Safe default provider — used whenever AI_PROVIDER is unset or the
 * selected provider's API key is not configured (local development, CI,
 * this environment), mirroring NodemailerEmailService's jsonTransport
 * fallback (ADR-009 Decision 4): the real call path still runs end-to-end
 * through the same interface every capability service uses, but no
 * outbound network request is made and no cost is incurred. Deterministic
 * so it is trivially assertable in tests.
 */
@Injectable()
export class StubAiProvider implements IAiProvider {
  readonly provider = AiProvider.STUB;
  private readonly logger = new Logger(StubAiProvider.name);

  async complete(input: AiCompletionInput): Promise<AiCompletionOutput> {
    this.logger.warn('AI_PROVIDER is not configured with a real provider — returning a stub completion, not calling any external AI service.');

    const lastUserMessage = [...input.messages].reverse().find((m) => m.role === 'user');
    const content = `[stub AI response] Acknowledged: "${(lastUserMessage?.content ?? '').slice(0, 200)}"`;

    return {
      content,
      provider: this.provider,
      model: 'stub',
      promptTokens: input.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0),
      completionTokens: Math.ceil(content.length / 4),
    };
  }
}
