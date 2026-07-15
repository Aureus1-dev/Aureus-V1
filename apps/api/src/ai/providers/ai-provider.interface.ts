import { AiProvider as AiProviderEnum } from '@prisma/client';

export const AI_PROVIDER = 'AI_PROVIDER';

export type AiMessageRole = 'system' | 'user' | 'assistant';

export interface AiCompletionMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiCompletionInput {
  messages: AiCompletionMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AiCompletionOutput {
  content: string;
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
