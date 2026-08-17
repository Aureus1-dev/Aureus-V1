import { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './openai.provider';
import type { AiToolDefinition } from './ai-provider.interface';

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = { OPENAI_API_KEY: 'test-key', ...overrides };
  return { get: (key: string, fallback?: string) => values[key] ?? fallback } as unknown as ConfigService;
}

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

  it('uses modern GPT-5 fields, minimal reasoning, and the requested completion-token budget', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-5-mini',
        choices: [{ finish_reason: 'stop', message: { content: 'Hello there.' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeConfig());
    await provider.complete({ messages: [{ role: 'user', content: 'Hi' }], maxTokens: 700, temperature: 0.2 });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe('gpt-5-mini');
    expect(body.max_completion_tokens).toBe(700);
    expect(body.reasoning_effort).toBe('minimal');
    expect(body.max_tokens).toBeUndefined();
    expect(body.temperature).toBeUndefined();
  });

  it('gives GPT-5 enough default completion budget for visible Steward output', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-5-mini',
        choices: [{ finish_reason: 'stop', message: { content: 'Let us work on the job search first.' } }],
        usage: { prompt_tokens: 20, completion_tokens: 15 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeConfig());
    await provider.complete({ messages: [{ role: 'user', content: 'I need a job' }] });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.max_completion_tokens).toBe(1200);
    expect(body.reasoning_effort).toBe('minimal');
  });

  it('retries once with a larger budget when GPT-5 spends the first allowance without visible output', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'gpt-5-mini',
          choices: [{ finish_reason: 'length', message: { content: '' } }],
          usage: { prompt_tokens: 20, completion_tokens: 1200 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'gpt-5-mini',
          choices: [{ finish_reason: 'stop', message: { content: 'I can help you work on the job, rent, and childcare together.' } }],
          usage: { prompt_tokens: 20, completion_tokens: 120 },
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeConfig());
    const result = await provider.complete({
      messages: [{ role: 'user', content: 'I am looking for a job and late on rent plus need childcare' }],
    });

    expect(result.content).toMatch(/job, rent, and childcare/i);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(retryBody.max_completion_tokens).toBe(2400);
  });

  it('rejects an empty non-tool completion so provider fallback can engage', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-5-mini',
        choices: [{ finish_reason: 'stop', message: { content: '' } }],
        usage: { prompt_tokens: 20, completion_tokens: 1 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeConfig());
    await expect(provider.complete({ messages: [{ role: 'user', content: 'I need a job' }] })).rejects.toThrow(
      /empty completion without tool calls/i,
    );
  });

  it('keeps legacy token and temperature fields for GPT-4-class Chat Completions models', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-4o-mini',
        choices: [{ finish_reason: 'stop', message: { content: 'Hello there.' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeConfig({ OPENAI_MODEL: 'gpt-4o-mini' }));
    await provider.complete({ messages: [{ role: 'user', content: 'Hi' }], maxTokens: 700, temperature: 0.2 });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.max_tokens).toBe(700);
    expect(body.max_completion_tokens).toBeUndefined();
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.temperature).toBe(0.2);
  });

  it('completes without tools when none are offered, and omits tool_choice entirely', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-5-mini',
        choices: [{ finish_reason: 'stop', message: { content: 'Hello there.' } }],
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
        model: 'gpt-5-mini',
        choices: [{ finish_reason: 'stop', message: { content: 'Okay.' } }],
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
        model: 'gpt-5-mini',
        choices: [{
          finish_reason: 'tool_calls',
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

  it('accepts a tool-only completion as usable provider output', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-5-mini',
        choices: [{
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [{ id: 'call-1', function: { name: 'navigate_to_route', arguments: '{"route":"journey"}' } }],
          },
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiProvider(makeConfig());
    const result = await provider.complete({ messages: [{ role: 'user', content: 'Take me to my journey' }], tools: [TOOL] });

    expect(result.content).toBe('');
    expect(result.toolCalls).toHaveLength(1);
  });

  it('retries a transient 500 and succeeds on the next attempt', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'server error' })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'gpt-5-mini',
          choices: [{ finish_reason: 'stop', message: { content: 'Recovered.' } }],
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
