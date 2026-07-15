import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AI_PROVIDER, IAiProvider } from './ai-provider.interface';
import { OpenAiProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { StubAiProvider } from './stub.provider';

/**
 * Selects the active IAiProvider implementation from AI_PROVIDER (ADR-015
 * Decision 1). Falls back to StubAiProvider whenever the selected provider
 * is unset or its API key is not configured — the same "safe, non-blocking
 * default" shape as EmailModule/NodemailerEmailService (ADR-009 Decision 4),
 * so every environment (local dev, CI, this implementation sandbox) works
 * end-to-end with zero external credentials.
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
        if (selected === 'openai' && config.get<string>('OPENAI_API_KEY')) return openAi;
        if (selected === 'anthropic' && config.get<string>('ANTHROPIC_API_KEY')) return anthropic;
        return stub;
      },
      inject: [ConfigService, OpenAiProvider, AnthropicProvider, StubAiProvider],
    },
  ],
  exports: [AI_PROVIDER],
})
export class AiProviderModule {}
