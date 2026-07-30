import { computeCostUsd } from './ai-pricing.util';

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
