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
  'gpt-5-mini': { prompt: 0.00025, completion: 0.002 },
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

/**
 * Realtime API per-model rates (USD per 1,000 tokens), priced by OpenAI
 * across six categories rather than text's flat prompt/completion pair —
 * audio and text are billed at very different rates, and a cached token
 * (the member's own prior turns, replayed back as context on every new
 * turn) is billed at a steep discount rather than free. `cachedTextInput`
 * is not separately published for the base gpt-realtime model as of this
 * writing; approximated at the same ~10%-of-standard-rate ratio OpenAI
 * applies to cached text elsewhere in the Realtime line (e.g.
 * gpt-realtime-2.1), pending an official rate — flagged here, not
 * silently assumed exact.
 */
const VOICE_PRICING_PER_1K_TOKENS_USD: Record<
  string,
  { audioInput: number; audioOutput: number; textInput: number; textOutput: number; cachedAudioInput: number; cachedTextInput: number }
> = {
  'gpt-realtime': {
    audioInput: 0.032,
    audioOutput: 0.064,
    textInput: 0.004,
    textOutput: 0.016,
    cachedAudioInput: 0.0004,
    cachedTextInput: 0.0004, // approximated — see comment above
  },
};

export interface VoiceTokenUsage {
  inputAudioTokens: number;
  inputTextTokens: number;
  cachedAudioTokens: number;
  cachedTextTokens: number;
  outputAudioTokens: number;
  outputTextTokens: number;
}

/**
 * Realtime API counterpart to computeCostUsd() — same unmapped-model
 * fallback behavior (log loudly, return 0, never throw) for the same
 * reason: an unpriced model must never silently bypass spend ceilings.
 * `cachedAudioTokens`/`cachedTextTokens` are counts *within*
 * `inputAudioTokens`/`inputTextTokens` (OpenAI's own response.usage
 * shape), not additional on top — subtracted out before applying the
 * standard input rate, then billed separately at the cached rate.
 */
export function computeVoiceCostUsd(model: string, usage: VoiceTokenUsage): number {
  const rate = VOICE_PRICING_PER_1K_TOKENS_USD[model];
  if (!rate) {
    logger.warn(
      `No voice pricing entry for model '${model}' — recording costUsd=0. Spend ceilings will under-count usage of this model until VOICE_PRICING_PER_1K_TOKENS_USD is updated.`,
    );
    return 0;
  }

  const billableAudioInput = Math.max(0, usage.inputAudioTokens - usage.cachedAudioTokens);
  const billableTextInput = Math.max(0, usage.inputTextTokens - usage.cachedTextTokens);

  return (
    (billableAudioInput / 1000) * rate.audioInput +
    (usage.cachedAudioTokens / 1000) * rate.cachedAudioInput +
    (billableTextInput / 1000) * rate.textInput +
    (usage.cachedTextTokens / 1000) * rate.cachedTextInput +
    (usage.outputAudioTokens / 1000) * rate.audioOutput +
    (usage.outputTextTokens / 1000) * rate.textOutput
  );
}
