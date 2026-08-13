import { AiProvider } from '@prisma/client';
import { FallbackAiProvider } from './fallback-ai.provider';
import type { AiCompletionOutput, IAiProvider } from './ai-provider.interface';

function makeOutput(o: Partial<AiCompletionOutput> = {}): AiCompletionOutput {
  return { content: 'ok', provider: AiProvider.OPENAI, model: 'test', promptTokens: 1, completionTokens: 1, ...o };
}

describe('FallbackAiProvider', () => {
  it('reports the primary provider identity', () => {
    const primary: jest.Mocked<IAiProvider> = { provider: AiProvider.OPENAI, complete: jest.fn() };
    const secondary: jest.Mocked<IAiProvider> = { provider: AiProvider.ANTHROPIC, complete: jest.fn() };
    const fallback = new FallbackAiProvider(primary, secondary);

    expect(fallback.provider).toBe(AiProvider.OPENAI);
  });

  it('returns the primary result and never calls the secondary when the primary succeeds', async () => {
    const primary: jest.Mocked<IAiProvider> = {
      provider: AiProvider.OPENAI,
      complete: jest.fn().mockResolvedValue(makeOutput({ content: 'from primary' })),
    };
    const secondary: jest.Mocked<IAiProvider> = { provider: AiProvider.ANTHROPIC, complete: jest.fn() };
    const fallback = new FallbackAiProvider(primary, secondary);

    const result = await fallback.complete({ messages: [{ role: 'user', content: 'hi' }] });

    expect(result.content).toBe('from primary');
    expect(secondary.complete).not.toHaveBeenCalled();
  });

  it('falls over to the secondary and returns its result when the primary fails', async () => {
    const primary: jest.Mocked<IAiProvider> = {
      provider: AiProvider.OPENAI,
      complete: jest.fn().mockRejectedValue(new Error('primary down')),
    };
    const secondary: jest.Mocked<IAiProvider> = {
      provider: AiProvider.ANTHROPIC,
      complete: jest.fn().mockResolvedValue(makeOutput({ content: 'from secondary' })),
    };
    const fallback = new FallbackAiProvider(primary, secondary);

    const result = await fallback.complete({ messages: [{ role: 'user', content: 'hi' }] });

    expect(result.content).toBe('from secondary');
    expect(primary.complete).toHaveBeenCalledTimes(1);
    expect(secondary.complete).toHaveBeenCalledTimes(1);
  });

  it('propagates the secondary error when both providers fail', async () => {
    const primary: jest.Mocked<IAiProvider> = {
      provider: AiProvider.OPENAI,
      complete: jest.fn().mockRejectedValue(new Error('primary down')),
    };
    const secondary: jest.Mocked<IAiProvider> = {
      provider: AiProvider.ANTHROPIC,
      complete: jest.fn().mockRejectedValue(new Error('secondary down too')),
    };
    const fallback = new FallbackAiProvider(primary, secondary);

    await expect(fallback.complete({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow('secondary down too');
  });

  it('never calls both providers concurrently — the secondary is only invoked after the primary settles', async () => {
    const callOrder: string[] = [];
    const primary: jest.Mocked<IAiProvider> = {
      provider: AiProvider.OPENAI,
      complete: jest.fn().mockImplementation(async () => {
        callOrder.push('primary-start');
        throw new Error('primary down');
      }),
    };
    const secondary: jest.Mocked<IAiProvider> = {
      provider: AiProvider.ANTHROPIC,
      complete: jest.fn().mockImplementation(async () => {
        callOrder.push('secondary-start');
        return makeOutput();
      }),
    };
    const fallback = new FallbackAiProvider(primary, secondary);

    await fallback.complete({ messages: [{ role: 'user', content: 'hi' }] });

    expect(callOrder).toEqual(['primary-start', 'secondary-start']);
  });
});
