import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AI_PROVIDER, IAiProvider } from './ai-provider.interface';
import { OpenAiProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { StubAiProvider } from './stub.provider';
import { FallbackAiProvider } from './fallback-ai.provider';

/**
 * Selects the active IAiProvider implementation from AI_PROVIDER (ADR-015
 * Decision 1). Falls back to StubAiProvider whenever the selected provider
 * is unset or its API key is not configured — the same "safe, non-blocking
 * default" shape as EmailModule/NodemailerEmailService (ADR-009 Decision 4),
 * so every environment (local dev, CI, this implementation sandbox) works
 * end-to-end with zero external credentials.
 *
 * PD-009 (AI Provider Resilience) — cross-provider fallback: when the
 * configured provider's own API key is present *and* the other provider's
 * key is also configured, the factory wraps both in `FallbackAiProvider`
 * instead of returning the primary alone, so a total outage of the
 * configured provider fails over to the other rather than hard-failing
 * every request. If only one key is configured, behavior is unchanged
 * from before this PD (the single configured provider, no fallback
 * possible since there is nothing to fall over to).
 */
@Module({
  imports: [ConfigModule],
  providers: [
    OpenAiProvider,
    AnthropicProvider,
    StubAiProvider,
    {
      provide: AI_PROVIDER,
      useFactory: (
        config: ConfigService,
        openAi: OpenAiProvider,
        anthropic: AnthropicProvider,
        stub: StubAiProvider,
      ): IAiProvider => {
        const selected = config.get<string>('AI_PROVIDER', 'stub');
        const hasOpenAiKey = Boolean(config.get<string>('OPENAI_API_KEY'));
        const hasAnthropicKey = Boolean(config.get<string>('ANTHROPIC_API_KEY'));

        if (selected === 'openai' && hasOpenAiKey) {
          return hasAnthropicKey ? new FallbackAiProvider(openAi, anthropic) : openAi;
        }
        if (selected === 'anthropic' && hasAnthropicKey) {
          return hasOpenAiKey ? new FallbackAiProvider(anthropic, openAi) : anthropic;
        }
        return stub;
      },
      inject: [ConfigService, OpenAiProvider, AnthropicProvider, StubAiProvider],
    },
  ],
  exports: [AI_PROVIDER, OpenAiProvider, AnthropicProvider],
})
export class AiProviderModule {}
