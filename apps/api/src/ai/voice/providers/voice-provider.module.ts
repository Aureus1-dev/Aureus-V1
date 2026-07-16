import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VOICE_PROVIDER, IVoiceProvider } from './voice-provider.interface';
import { OpenAiVoiceProvider } from './openai-voice.provider';
import { StubVoiceProvider } from './stub-voice.provider';

/**
 * Selects the active IVoiceProvider from whether OPENAI_API_KEY is
 * configured — the same "real key present -> real provider, else safe stub"
 * shape as AiProviderModule, reusing the existing key (Founder Decision:
 * "already usable via the existing OPENAI_API_KEY... no new vendor
 * onboarding needed"). No AI_PROVIDER branch on "anthropic" here: Anthropic
 * has no realtime voice product to select.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    OpenAiVoiceProvider,
    StubVoiceProvider,
    {
      provide: VOICE_PROVIDER,
      useFactory: (config: ConfigService, openAi: OpenAiVoiceProvider, stub: StubVoiceProvider): IVoiceProvider => {
        return config.get<string>('OPENAI_API_KEY') ? openAi : stub;
      },
      inject: [ConfigService, OpenAiVoiceProvider, StubVoiceProvider],
    },
  ],
  exports: [VOICE_PROVIDER],
})
export class VoiceProviderModule {}
