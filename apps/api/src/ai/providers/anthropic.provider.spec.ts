import { ConfigService } from '@nestjs/config';
import { AnthropicProvider } from './anthropic.provider';
import type { AiToolDefinition } from './ai-provider.interface';

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = { ANTHROPIC_API_KEY: 'test-key', ...overrides };
  return { get: (key: string, fallback?: string) => values[key] ?? fallback } as unknown as ConfigService;
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
});
