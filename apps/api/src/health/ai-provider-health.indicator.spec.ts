import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';
import { AiProviderHealthIndicator } from './ai-provider-health.indicator';
import { OpenAiProvider } from '../ai/providers/openai.provider';
import { AnthropicProvider } from '../ai/providers/anthropic.provider';

function makeConfig(values: Record<string, string> = {}): ConfigService {
  return { get: (key: string, fallback?: string) => values[key] ?? fallback } as unknown as ConfigService;
}

describe('AiProviderHealthIndicator', () => {
  const openAi = { getCircuitState: jest.fn() } as unknown as jest.Mocked<OpenAiProvider>;
  const anthropic = { getCircuitState: jest.fn() } as unknown as jest.Mocked<AnthropicProvider>;

  afterEach(() => jest.clearAllMocks());

  it('reports healthy without checking either provider when neither has a configured key', async () => {
    const indicator = new AiProviderHealthIndicator(makeConfig(), openAi, anthropic);
    const result = await indicator.isHealthy('aiProvider');

    expect(result.aiProvider.status).toBe('up');
    expect(openAi.getCircuitState).not.toHaveBeenCalled();
    expect(anthropic.getCircuitState).not.toHaveBeenCalled();
  });

  it('reports healthy when the configured provider circuit is closed', async () => {
    (openAi.getCircuitState as jest.Mock).mockReturnValue('closed');
    const indicator = new AiProviderHealthIndicator(makeConfig({ OPENAI_API_KEY: 'key', AI_PROVIDER: 'openai' }), openAi, anthropic);

    const result = await indicator.isHealthy('aiProvider');

    expect(result.aiProvider.status).toBe('up');
    expect(result.aiProvider.openai).toBe('closed');
  });

  it('throws HealthCheckError when the configured provider circuit is open', async () => {
    (openAi.getCircuitState as jest.Mock).mockReturnValue('open');
    const indicator = new AiProviderHealthIndicator(makeConfig({ OPENAI_API_KEY: 'key', AI_PROVIDER: 'openai' }), openAi, anthropic);

    await expect(indicator.isHealthy('aiProvider')).rejects.toThrow(HealthCheckError);
  });

  it('checks both providers when both have configured keys, and flags unhealthy if either is open', async () => {
    (openAi.getCircuitState as jest.Mock).mockReturnValue('closed');
    (anthropic.getCircuitState as jest.Mock).mockReturnValue('open');
    const indicator = new AiProviderHealthIndicator(
      makeConfig({ OPENAI_API_KEY: 'key1', ANTHROPIC_API_KEY: 'key2', AI_PROVIDER: 'openai' }),
      openAi,
      anthropic,
    );

    await expect(indicator.isHealthy('aiProvider')).rejects.toThrow(HealthCheckError);
    expect(openAi.getCircuitState).toHaveBeenCalled();
    expect(anthropic.getCircuitState).toHaveBeenCalled();
  });

  it('does not throw when half_open — a provider recovering is not treated as unhealthy', async () => {
    (openAi.getCircuitState as jest.Mock).mockReturnValue('half_open');
    const indicator = new AiProviderHealthIndicator(makeConfig({ OPENAI_API_KEY: 'key', AI_PROVIDER: 'openai' }), openAi, anthropic);

    const result = await indicator.isHealthy('aiProvider');
    expect(result.aiProvider.status).toBe('up');
  });
});
