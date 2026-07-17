import { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './openai.provider';
import type { AiToolDefinition } from './ai-provider.interface';

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = { OPENAI_API_KEY: 'test-key', ...overrides };
  return { get: (key: string, fallback?: string) => values[key] ?? fallback } as unknown as ConfigService;
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
});
