import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import { AiCompletionInput, AiCompletionOutput, AiToolDefinition, IAiProvider } from './ai-provider.interface';
import { CircuitBreaker, CircuitState } from './resilience/circuit-breaker';
import { resilientFetch } from './resilience/resilient-fetch.util';

interface OpenAiChatResponse {
  model: string;
  choices: {
    message: {
      content: string | null;
      tool_calls?: { id: string; function: { name: string; arguments: string } }[];
    };
  }[];
  usage: { prompt_tokens: number; completion_tokens: number };
}

function toOpenAiTool(def: AiToolDefinition) {
  return { type: 'function' as const, function: { name: def.name, description: def.description, parameters: def.parameters } };
}

function usesModernCompletionTokenField(model: string): boolean {
  return /^(gpt-5(?:[.-]|$)|o[134](?:[.-]|$))/.test(model);
}

/**
 * OpenAI Chat Completions provider. Calls the real REST API via the
 * platform-standard runtime `fetch` — no vendor SDK dependency, matching
 * NodemailerEmailService's provider-agnostic-transport precedent (ADR-009
 * §7). Only ever instantiated by the AI_PROVIDER factory when OPENAI_API_KEY
 * is actually configured (ai.module.ts) — this class assumes a key exists.
 *
 * PD-009 (AI Provider Resilience): the network call is wrapped in
 * `resilientFetch` (configurable timeout + bounded retry-with-backoff, only
 * for transient failure categories) and this instance's own `CircuitBreaker`
 * (one per Nest singleton, so shared across every request that hits this
 * provider) — a provider already known to be down fails fast instead of
 * repeating the full timeout+retry cost on every subsequent request.
 */
@Injectable()
export class OpenAiProvider implements IAiProvider {
  readonly provider = AiProvider.OPENAI;
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly circuitBreaker: CircuitBreaker;

  constructor(private readonly config: ConfigService) {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: this.config.get<number>('AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD', 3),
      cooldownMs: this.config.get<number>('AI_CIRCUIT_BREAKER_COOLDOWN_MS', 30_000),
    });
  }

  /** PD-009 — surfaces this instance's circuit-breaker state for `AiProviderHealthIndicator` (`/health/ai`). */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  async complete(input: AiCompletionInput): Promise<AiCompletionOutput> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    const model = this.config.get<string>('OPENAI_MODEL', 'gpt-5-mini');
    const modernCompletionFields = usesModernCompletionTokenField(model);

    const res = await this.circuitBreaker.execute(() =>
      resilientFetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
            ...(modernCompletionFields
              ? { max_completion_tokens: input.maxTokens ?? 500 }
              : { max_tokens: input.maxTokens ?? 500, temperature: input.temperature ?? 0.3 }),
            ...(input.tools?.length ? { tools: input.tools.map(toOpenAiTool), tool_choice: 'auto' } : {}),
          }),
        },
        {
          timeoutMs: this.config.get<number>('AI_PROVIDER_TIMEOUT_MS', 30_000),
          maxAttempts: this.config.get<number>('AI_PROVIDER_MAX_ATTEMPTS', 3),
          baseDelayMs: this.config.get<number>('AI_PROVIDER_RETRY_BASE_DELAY_MS', 500),
          logger: this.logger,
          providerName: 'OpenAI',
        },
      ),
    );

    const data = (await res.json()) as OpenAiChatResponse;
    const message = data.choices[0]?.message;
    return {
      content: message?.content ?? '',
      toolCalls: message?.tool_calls?.map((tc) => ({ id: tc.id, name: tc.function.name, arguments: tc.function.arguments })),
      provider: this.provider,
      model: data.model ?? model,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    };
  }
}
