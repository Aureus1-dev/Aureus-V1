import { AiProvider } from '@prisma/client';
import { StubAiProvider } from './stub.provider';

describe('StubAiProvider', () => {
  const provider = new StubAiProvider();

  it('returns a deterministic completion without calling any external service', async () => {
    const result = await provider.complete({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is a Journey?' },
      ],
    });

    expect(result.provider).toBe(AiProvider.STUB);
    expect(result.model).toBe('stub');
    expect(result.content).toContain('What is a Journey?');
    expect(result.promptTokens).toBeGreaterThan(0);
    expect(result.completionTokens).toBeGreaterThan(0);
  });

  it('handles multimodal input without echoing image bytes', async () => {
    const result = await provider.complete({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Guide this application.' },
          { type: 'image', mediaType: 'image/png', data: 'SECRETIMAGEBYTES' },
        ],
      }],
    });

    expect(result.content).toContain('Guide this application.');
    expect(result.content).not.toContain('SECRETIMAGEBYTES');
  });

  it('handles a conversation with no user message', async () => {
    const result = await provider.complete({ messages: [{ role: 'system', content: 'System only.' }] });
    expect(result.content).toContain('[stub AI response]');
  });
});
