import { ConfigService } from '@nestjs/config';
import { GeminiLiveVoiceProvider } from './gemini-live-voice.provider';
import type { VoiceSessionBrokerInput } from './voice-provider.interface';

const INPUT: VoiceSessionBrokerInput = {
  model: 'gemini-3.1-flash-live-preview',
  voice: 'Kore',
  instructions: 'Be a calm Steward.',
  turnDetectionConfig: { type: 'semantic_vad' },
  tools: [
    {
      type: 'function',
      name: 'navigate_to_route',
      description: 'Navigate.',
      parameters: { type: 'object' },
    },
  ],
};

describe('GeminiLiveVoiceProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('brokers a constrained one-use Gemini Live token without exposing the permanent key', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'auth_tokens/ephemeral-123',
        expireTime: '2026-08-11T07:30:00.000Z',
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const config = {
      get: (key: string) => (key === 'GEMINI_API_KEY' ? 'server-key' : undefined),
    } as ConfigService;

    const result = await new GeminiLiveVoiceProvider(config).brokerSession(INPUT);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/auth_tokens',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-goog-api-key': 'server-key' }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.uses).toBe(1);
    expect(body.liveConnectConstraints.model).toBe(`models/${INPUT.model}`);
    expect(body.liveConnectConstraints.config.responseModalities).toEqual(['AUDIO']);
    expect(body.liveConnectConstraints.config.tools[0].functionDeclarations[0].name).toBe(
      'navigate_to_route',
    );
    expect(result.clientSecret).toBe('auth_tokens/ephemeral-123');
    expect(JSON.stringify(body)).not.toContain('server-key');
  });

  it('never returns a partial credential when Google rejects the request', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'bad key',
      }) as unknown as typeof fetch;
    const config = { get: () => 'server-key' } as unknown as ConfigService;
    await expect(new GeminiLiveVoiceProvider(config).brokerSession(INPUT)).rejects.toThrow(
      'Gemini Live token broker failed with status 401',
    );
  });
});
