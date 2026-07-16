import { AiProvider } from '@prisma/client';
import { StubVoiceProvider } from './stub-voice.provider';

describe('StubVoiceProvider', () => {
  const provider = new StubVoiceProvider();

  it('returns a deterministic-shape fake credential without calling any external service', async () => {
    const result = await provider.brokerSession({
      model: 'gpt-4o-realtime-preview',
      voice: 'alloy',
      instructions: 'You are a helpful assistant.',
      turnDetectionConfig: { type: 'semantic_vad', eagerness: 'low' },
    });

    expect(result.provider ?? AiProvider.STUB).toBe(AiProvider.STUB);
    expect(result.clientSecret).toMatch(/^stub_secret_/);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.providerSessionRef).toBeNull();
  });

  it('reports the STUB provider identity', () => {
    expect(provider.provider).toBe(AiProvider.STUB);
  });
});
