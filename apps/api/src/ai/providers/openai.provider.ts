import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import {
  AiCompletionInput,
  AiCompletionOutput,
  AiMessageContent,
  AiToolDefinition,
  IAiProvider,
} from './ai-provider.interface';
import { CircuitBreaker, CircuitState } from './resilience/circuit-breaker';
import { resilientFetch } from './resilience/resilient-fetch.util';

interface OpenAiChatResponse {
  model: string;
  choices: {
    finish_reason?: string | null;
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

function toOpenAiContent(content: AiMessageContent) {
  if (typeof content === 'string') return content;
  return content.map((part) =>
    part.type === 'text'
      ? { type: 'text' as const, text: part.text }
      : {
          type: 'image_url' as const,
          image_url: {
            url: `data:${part.mediaType};base64,${part.data}`,
            detail: part.detail ?? 'auto',
          },
        },
  );
}

function usesModernCompletionTokenField(model: string): boolean {
  return /^(gpt-5(?:[.-]|$)|o[134](?:[.-]|$))/.test(model);
}

function isGpt5Model(model: string): boolean {
  return /^gpt-5(?:[.-]|$)/.test(model);
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
    const defaultCompletionTokens = modernCompletionFields
      ? this.config.get<number>('OPENAI_MAX_COMPLETION_TOKENS', 1200)
      : 500;
    const requestedCompletionTokens = input.maxTokens ?? defaultCompletionTokens;
    const reasoningEffort = this.config.get<string>('OPENAI_REASONING_EFFORT', 'minimal');

    const callOpenAi = async (maxCompletionTokens: number): Promise<OpenAiChatResponse> => {
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
              messages: input.messages.map((m) => ({
                role: m.role,
                content: toOpenAiContent(m.content),
              })),
              ...(modernCompletionFields
                ? {
                    max_completion_tokens: maxCompletionTokens,
                    ...(isGpt5Model(model) ? { reasoning_effort: reasoningEffort } : {}),
                  }
                : { max_tokens: maxCompletionTokens, temperature: input.temperature ?? 0.3 }),
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
      return (await res.json()) as OpenAiChatResponse;
    };

    let data = await callOpenAi(requestedCompletionTokens);
    let choice = data.choices[0];
    let message = choice?.message;

    // GPT-5 reasoning tokens count against max_completion_tokens. With the old
    // 500-token default a normal substantive Steward request could exhaust the
    // whole allowance before any visible text was emitted, producing a
    // successful HTTP response with empty content. Retry that specific
    // truncation once with a larger allowance before declaring the provider
    // output unusable.
    if (
      modernCompletionFields &&
      input.maxTokens === undefined &&
      choice?.finish_reason === 'length' &&
      !message?.content?.trim() &&
      !message?.tool_calls?.length
    ) {
      const retryTokens = Math.max(requestedCompletionTokens * 2, 2400);
      this.logger.warn(
        `OpenAI ${model} exhausted ${requestedCompletionTokens} completion tokens before visible output; retrying once with ${retryTokens}.`,
      );
      data = await callOpenAi(retryTokens);
      choice = data.choices[0];
      message = choice?.message;
    }

    const content = message?.content?.trim() ?? '';
    const toolCalls = message?.tool_calls?.map((tc) => ({ id: tc.id, name: tc.function.name, arguments: tc.function.arguments }));

    // Empty natural-language content is valid only when the model actually
    // returned a tool call. Otherwise this is not a usable completion and must
    // be treated as provider failure so cross-provider fallback can engage.
    if (!content && !toolCalls?.length) {
      throw new Error(
        `OpenAI returned an empty completion without tool calls (model=${data.model ?? model}, finish_reason=${choice?.finish_reason ?? 'unknown'}).`,
      );
    }

    return {
      content,
      toolCalls,
      provider: this.provider,
      model: data.model ?? model,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    };
  }
}
