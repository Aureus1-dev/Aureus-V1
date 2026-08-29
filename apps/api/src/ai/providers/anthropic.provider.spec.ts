import { ConfigService } from '@nestjs/config';
import { AnthropicProvider } from './anthropic.provider';
import type { AiToolDefinition } from './ai-provider.interface';

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = { ANTHROPIC_API_KEY: 'test-key', ...overrides };
  return { get: (key: string, fallback?: string) => values[key] ?? fallback } as unknown as ConfigService;
}

// PD-009 — a small base delay/cooldown keeps retry- and circuit-breaker-exercising tests fast and deterministic.
function makeFastResilienceConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    ANTHROPIC_API_KEY: 'test-key',
    AI_PROVIDER_RETRY_BASE_DELAY_MS: 1,
    AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD: 2,
    AI_CIRCUIT_BREAKER_COOLDOWN_MS: 10_000,
    ...overrides,
  };
  return { get: (key: string, fallback?: unknown) => values[key] ?? fallback } as unknown as ConfigService;
}

const TOOL: AiToolDefinition = {
  name: 'navigate_to_route',
  description: 'Navigate.',
  parameters: { type: 'object', properties: { route: { type: 'string' } }, required: ['route'] },
};

describe('AnthropicProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('translates provider-neutral image input to Anthropic base64 image blocks', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'claude-sonnet-5',
        content: [{ type: 'text', text: 'I can see the form.' }],
        usage: { input_tokens: 25, output_tokens: 7 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new AnthropicProvider(makeConfig({ ANTHROPIC_MODEL: 'claude-sonnet-5' }));
    await provider.complete({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Guide me through this screen.' },
          { type: 'image', mediaType: 'image/jpeg', data: 'YWJj' },
        ],
      }],
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'Guide me through this screen.' },
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: 'YWJj' },
      },
    ]);
  });

  it('maps offered AiToolDefinitions to the Messages API flat input_schema wire format', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'claude-3-5-haiku-20241022',
        content: [{ type: 'text', text: 'Sure.' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new AnthropicProvider(makeConfig());
    await provider.complete({ messages: [{ role: 'user', content: 'Take me to my journey' }], tools: [TOOL] });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tools).toEqual([{ name: TOOL.name, description: TOOL.description, input_schema: TOOL.parameters }]);
  });

  it('normalizes a returned tool_use content block into AiToolCallRequest with JSON-stringified arguments', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'claude-3-5-haiku-20241022',
        content: [
          { type: 'text', text: 'Taking you there now.' },
          { type: 'tool_use', id: 'call-1', name: 'navigate_to_route', input: { route: 'journey' } },
        ],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new AnthropicProvider(makeConfig());
    const result = await provider.complete({ messages: [{ role: 'user', content: 'Take me to my journey' }], tools: [TOOL] });

    expect(result.content).toBe('Taking you there now.');
    expect(result.toolCalls).toEqual([{ id: 'call-1', name: 'navigate_to_route', arguments: '{"route":"journey"}' }]);
  });

  it('leaves toolCalls undefined when the model responds with text only', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'claude-3-5-haiku-20241022',
        content: [{ type: 'text', text: 'A Journey tracks progress toward a Goal.' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new AnthropicProvider(makeConfig());
    const result = await provider.complete({ messages: [{ role: 'user', content: 'What is a Journey?' }] });

    expect(result.toolCalls).toBeUndefined();
  });

  // ── PD-009: AI Provider Resilience (retry, circuit breaker) ──

  it('retries a transient 500 and succeeds on the next attempt', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'server error' })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'claude-3-5-haiku-20241022',
          content: [{ type: 'text', text: 'Recovered.' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new AnthropicProvider(makeFastResilienceConfig());
    const result = await provider.complete({ messages: [{ role: 'user', content: 'Hi' }] });

    expect(result.content).toBe('Recovered.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never retries a 4xx — surfaces the failure immediately', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid api key' });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new AnthropicProvider(makeFastResilienceConfig());
    await expect(provider.complete({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toMatchObject({ category: 'client_error' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('opens the circuit breaker after consecutive failures and fails fast without calling fetch again', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'down' });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new AnthropicProvider(makeFastResilienceConfig({ AI_PROVIDER_MAX_ATTEMPTS: 1 }));

    await expect(provider.complete({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow();
    expect(provider.getCircuitState()).toBe('closed');
    await expect(provider.complete({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow();
    expect(provider.getCircuitState()).toBe('open');

    fetchMock.mockClear();
    await expect(provider.complete({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toMatchObject({ category: 'circuit_open' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
