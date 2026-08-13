import { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './openai.provider';
import type { AiToolDefinition } from './ai-provider.interface';

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = { OPENAI_API_KEY: 'test-key', ...overrides };
  return { get: (key: string, fallback?: string) => values[key] ?? fallback } as unknown as ConfigService;
}

// PD-009 — a small base delay/cooldown keeps retry- and circuit-breaker-exercising tests fast and deterministic.
function makeFastResilienceConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    OPENAI_API_KEY: 'test-key',
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

describe('OpenAiProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('completes without tools when none are offered, and omits tool_choice entirely', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-4o-mini',
        choices: [{ message: { content: 'Hello there.' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeConfig());
    const result = await provider.complete({ messages: [{ role: 'user', content: 'Hi' }] });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tools).toBeUndefined();
    expect(result.content).toBe('Hello there.');
    expect(result.toolCalls).toBeUndefined();
  });

  it('maps offered AiToolDefinitions to the Chat Completions nested function-tool wire format', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-4o-mini',
        choices: [{ message: { content: '' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeConfig());
    await provider.complete({ messages: [{ role: 'user', content: 'Take me to my journey' }], tools: [TOOL] });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tool_choice).toBe('auto');
    expect(body.tools).toEqual([
      { type: 'function', function: { name: TOOL.name, description: TOOL.description, parameters: TOOL.parameters } },
    ]);
  });

  it('normalizes a returned tool_call into AiToolCallRequest, alongside any accompanying content', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-4o-mini',
        choices: [{
          message: {
            content: 'Taking you there now.',
            tool_calls: [{ id: 'call-1', function: { name: 'navigate_to_route', arguments: '{"route":"journey"}' } }],
          },
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeConfig());
    const result = await provider.complete({ messages: [{ role: 'user', content: 'Take me to my journey' }], tools: [TOOL] });

    expect(result.content).toBe('Taking you there now.');
    expect(result.toolCalls).toEqual([{ id: 'call-1', name: 'navigate_to_route', arguments: '{"route":"journey"}' }]);
  });

  // ── PD-009: AI Provider Resilience (retry, circuit breaker) ──

  it('retries a transient 500 and succeeds on the next attempt', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'server error' })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'gpt-4o-mini',
          choices: [{ message: { content: 'Recovered.' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeFastResilienceConfig());
    const result = await provider.complete({ messages: [{ role: 'user', content: 'Hi' }] });

    expect(result.content).toBe('Recovered.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never retries a 4xx — surfaces the failure immediately', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid api key' });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeFastResilienceConfig());
    await expect(provider.complete({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toMatchObject({ category: 'client_error' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('opens the circuit breaker after consecutive failures and fails fast without calling fetch again', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'down' });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeFastResilienceConfig({ AI_PROVIDER_MAX_ATTEMPTS: 1 }));

    await expect(provider.complete({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow();
    expect(provider.getCircuitState()).toBe('closed');
    await expect(provider.complete({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow();
    expect(provider.getCircuitState()).toBe('open');

    fetchMock.mockClear();
    await expect(provider.complete({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toMatchObject({ category: 'circuit_open' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
