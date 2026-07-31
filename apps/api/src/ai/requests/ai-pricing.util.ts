import { Logger } from '@nestjs/common';

const logger = new Logger('AiPricingUtil');

/**
 * Per-model USD cost per 1,000 tokens, used to compute AiRequest.costUsd at
 * write time (ADR-015 Decision 3). A provider constant, not business policy
 * — kept as a plain map rather than a Prisma-column default (contrast
 * StewardCapacity.maxActiveMembers, ADR-011 Decision 4), since there is no
 * per-installation reason to configure it differently.
 */
const PRICING_PER_1K_TOKENS_USD: Record<string, { prompt: number; completion: number }> = {
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  'gpt-4o': { prompt: 0.0025, completion: 0.01 },
  'claude-3-5-haiku-20241022': { prompt: 0.0008, completion: 0.004 },
  'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 },
};

/**
 * Returns 0 for an unmapped model — but that 0 feeds directly into the spend
 * ceilings in AiRequestsService, so silently under-reporting cost would let
 * an unmapped/new model bypass budget enforcement. Logged loudly (PR-002)
 * so a missing price entry surfaces as an operational alert, not a quiet gap.
 */
export function computeCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const rate = PRICING_PER_1K_TOKENS_USD[model];
  if (!rate) {
    logger.warn(
      `No pricing entry for model '${model}' — recording costUsd=0. Spend ceilings will under-count usage of this model until PRICING_PER_1K_TOKENS_USD is updated.`,
    );
    return 0;
  }
  return (promptTokens / 1000) * rate.prompt + (completionTokens / 1000) * rate.completion;
}
