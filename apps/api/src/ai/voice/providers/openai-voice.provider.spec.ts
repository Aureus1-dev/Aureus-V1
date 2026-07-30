import { ConfigService } from '@nestjs/config';
import { OpenAiVoiceProvider } from './openai-voice.provider';
import type { VoiceSessionBrokerInput } from './voice-provider.interface';

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = { OPENAI_API_KEY: 'test-key', ...overrides };
  return { get: (key: string, fallback?: string) => values[key] ?? fallback } as unknown as ConfigService;
}

const INPUT: VoiceSessionBrokerInput = {
  model: 'gpt-realtime',
  voice: 'marin',
  instructions: 'Be a calm Steward.',
  turnDetectionConfig: { type: 'semantic_vad', eagerness: 'low', create_response: true, interrupt_response: true },
  tools: [{ type: 'function', name: 'navigate_to_route', description: 'Navigate.', parameters: {} }],
};

describe('OpenAiVoiceProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('posts to the GA client_secrets endpoint with model/voice/turn_detection nested under session', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ value: 'ek_123', expires_at: 1735689600, session: { id: 'sess_abc' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiVoiceProvider(makeConfig());
    await provider.brokerSession(INPUT);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/realtime/client_secrets',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({
      session: {
        type: 'realtime',
        model: INPUT.model,
        instructions: INPUT.instructions,
        audio: {
          input: { turn_detection: INPUT.turnDetectionConfig },
          output: { voice: INPUT.voice },
        },
        tools: INPUT.tools,
        tool_choice: 'auto',
      },
    });
  });

  it('maps the GA response (value/expires_at/session.id) into the provider-neutral broker output', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ value: 'ek_123', expires_at: 1735689600, session: { id: 'sess_abc' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiVoiceProvider(makeConfig());
    const result = await provider.brokerSession(INPUT);

    expect(result).toEqual({
      clientSecret: 'ek_123',
      expiresAt: new Date(1735689600 * 1000),
      providerSessionRef: 'sess_abc',
    });
  });

  it('falls back to a null providerSessionRef when the response omits session.id', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ value: 'ek_123', expires_at: 1735689600 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiVoiceProvider(makeConfig());
    const result = await provider.brokerSession(INPUT);

    expect(result.providerSessionRef).toBeNull();
  });

  it('logs and throws when the broker call fails, never returning a partial credential', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid api key',
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiVoiceProvider(makeConfig());

    await expect(provider.brokerSession(INPUT)).rejects.toThrow(
      'OpenAI realtime session broker failed with status 401',
    );
  });
});
