import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VOICE_PROVIDER, IVoiceProvider } from './voice-provider.interface';
import { OpenAiVoiceProvider } from './openai-voice.provider';
import { StubVoiceProvider } from './stub-voice.provider';
import { GeminiLiveVoiceProvider } from './gemini-live-voice.provider';

/**
 * Provider selection is explicit. Production validation rejects the stub and
 * requires the credential matching VOICE_PROVIDER, so a missing key can no
 * longer ship a UI that appears voice-ready but always fails after the member
 * grants microphone access.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    OpenAiVoiceProvider,
    GeminiLiveVoiceProvider,
    StubVoiceProvider,
    {
      provide: VOICE_PROVIDER,
      useFactory: (
        config: ConfigService,
        openAi: OpenAiVoiceProvider,
        gemini: GeminiLiveVoiceProvider,
        stub: StubVoiceProvider,
      ): IVoiceProvider => {
        const selected = config.get<string>('VOICE_PROVIDER', 'stub');
        if (selected === 'openai') return openAi;
        if (selected === 'gemini') return gemini;
        return stub;
      },
      inject: [ConfigService, OpenAiVoiceProvider, GeminiLiveVoiceProvider, StubVoiceProvider],
    },
  ],
  exports: [VOICE_PROVIDER],
})
export class VoiceProviderModule {}
