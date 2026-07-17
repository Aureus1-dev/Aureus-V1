import { AiProvider as AiProviderEnum } from '@prisma/client';

export const AI_PROVIDER = 'AI_PROVIDER';

export type AiMessageRole = 'system' | 'user' | 'assistant';

export interface AiCompletionMessage {
  role: AiMessageRole;
  content: string;
}

/**
 * A tool definition offered to the model, in a provider-neutral shape.
 * `interface-tools.ts` is the only production source of these — every
 * concrete provider translates this shape into its own wire format
 * (OpenAI's nested `function` wrapper, Anthropic's flat `input_schema`)
 * internally, so callers never need to know which provider is active
 * (DOMAIN-007 Founder Decision 1).
 */
export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** A tool call the model requested in its response, normalized across providers. `arguments` is always a JSON string, even for providers (Anthropic) whose native format is already a parsed object. */
export interface AiToolCallRequest {
  id: string;
  name: string;
  arguments: string;
}

export interface AiCompletionInput {
  messages: AiCompletionMessage[];
  maxTokens?: number;
  temperature?: number;
  tools?: AiToolDefinition[];
}

export interface AiCompletionOutput {
  content: string;
  /** Present only when the model requested one or more tool calls in this response. */
  toolCalls?: AiToolCallRequest[];
  provider: AiProviderEnum;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Provider abstraction (PA-006 / ADR-015 Decision 1) — every capability
 * service depends on this interface only, never on a concrete provider
 * class, so providers can be swapped (or a future one added) by changing
 * the AI_PROVIDER env var and DI factory wiring alone, with zero change to
 * any business logic that calls complete().
 */
export interface IAiProvider {
  readonly provider: AiProviderEnum;
  complete(input: AiCompletionInput): Promise<AiCompletionOutput>;
}
