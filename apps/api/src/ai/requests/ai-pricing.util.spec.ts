import { computeCostUsd, computeVoiceCostUsd, type VoiceTokenUsage } from './ai-pricing.util';

describe('computeCostUsd', () => {
  it('prices gpt-5-mini (the current OpenAI text-completion default) per its published per-1K-token rate', () => {
    expect(computeCostUsd('gpt-5-mini', 1000, 1000)).toBeCloseTo(0.00025 + 0.002, 6);
  });

  it('prices gpt-4o-mini (kept for any request still recorded against it)', () => {
    expect(computeCostUsd('gpt-4o-mini', 1000, 1000)).toBeCloseTo(0.00015 + 0.0006, 6);
  });

  it('returns 0 and never throws for an unmapped model, so an unrecognized model never crashes request logging', () => {
    expect(computeCostUsd('some-future-model', 1000, 1000)).toBe(0);
  });

  it('scales linearly with token counts below 1K', () => {
    expect(computeCostUsd('gpt-5-mini', 500, 250)).toBeCloseTo(0.000125 + 0.0005, 6);
  });
});

describe('computeVoiceCostUsd', () => {
  const zeroUsage: VoiceTokenUsage = {
    inputAudioTokens: 0, inputTextTokens: 0, cachedAudioTokens: 0, cachedTextTokens: 0,
    outputAudioTokens: 0, outputTextTokens: 0,
  };

  it('prices a purely-spoken turn (audio in, audio out, no caching) at the gpt-realtime audio rates', () => {
    const usage: VoiceTokenUsage = { ...zeroUsage, inputAudioTokens: 1000, outputAudioTokens: 1000 };
    expect(computeVoiceCostUsd('gpt-realtime', usage)).toBeCloseTo(0.032 + 0.064, 6);
  });

  it('prices text-only usage (e.g. a tool-call-only turn with no spoken audio) at the text rates', () => {
    const usage: VoiceTokenUsage = { ...zeroUsage, inputTextTokens: 1000, outputTextTokens: 1000 };
    expect(computeVoiceCostUsd('gpt-realtime', usage)).toBeCloseTo(0.004 + 0.016, 6);
  });

  it('bills cached input tokens at the steep cached rate instead of the standard input rate', () => {
    const usage: VoiceTokenUsage = { ...zeroUsage, inputAudioTokens: 1000, cachedAudioTokens: 1000 };
    // Fully cached: no billable (non-cached) audio input, only the cached rate applies.
    expect(computeVoiceCostUsd('gpt-realtime', usage)).toBeCloseTo(0.0004, 6);
  });

  it('subtracts the cached portion from the standard rate rather than double-billing it', () => {
    const usage: VoiceTokenUsage = { ...zeroUsage, inputAudioTokens: 1000, cachedAudioTokens: 400 };
    // 600 tokens at the standard rate + 400 tokens at the cached rate.
    expect(computeVoiceCostUsd('gpt-realtime', usage)).toBeCloseTo(0.6 * 0.032 + 0.4 * 0.0004, 6);
  });

  it('returns 0 and never throws for an unmapped model, so an unrecognized model never crashes request logging', () => {
    expect(computeVoiceCostUsd('some-future-realtime-model', zeroUsage)).toBe(0);
  });

  it('never goes negative even if a reported cached count exceeds the reported input count', () => {
    const usage: VoiceTokenUsage = { ...zeroUsage, inputAudioTokens: 100, cachedAudioTokens: 500 };
    expect(computeVoiceCostUsd('gpt-realtime', usage)).toBeGreaterThanOrEqual(0);
  });
});
