/**
 * PD-007 (AI Safety: Content Moderation & Prompt-Injection Defense).
 * Deterministic fallback moderation check — used whenever no real
 * provider-native moderation endpoint is configured (Anthropic, which has
 * no free-standing moderation API today, and the local/CI stub provider,
 * which by design makes zero external network calls). This is
 * intentionally a conservative, documented, reviewable phrase list — the
 * same reliability reasoning `needs/crisis-detection.util.ts` (Gate C, C3)
 * already established in this codebase for the same class of problem: a
 * safety check must reliably trigger, not merely probably trigger, so it is
 * deterministic rather than left to model judgment.
 *
 * This is a baseline safety net, not a claim of parity with a real,
 * ML-based moderation classifier (`ModerationService` prefers the real
 * OpenAI moderation endpoint whenever an OpenAI API key is configured,
 * regardless of which provider is handling completions — see
 * `moderation.service.ts`).
 */
export type ModerationCategory = 'self-harm' | 'violence' | 'sexual' | 'hate';

const CATEGORY_PHRASES: Record<ModerationCategory, string[]> = {
  'self-harm': [
    'suicide', 'suicidal', 'kill myself', 'want to die', 'wanna die', 'end my life', 'ending my life',
    'no reason to live', "can't go on", 'cant go on', 'hurt myself', 'hurting myself', 'self harm', 'self-harm',
    'overdose',
  ],
  violence: [
    'kill him', 'kill her', 'kill them', 'kill you', 'going to hurt someone', 'going to hurt me',
    'i will kill', "i'm going to kill", 'im going to kill', 'shoot up the', 'bomb the',
  ],
  sexual: [
    'sexual content involving a minor', 'child sexual', 'sex with a child', 'nude photos of a child',
  ],
  // Deliberately does not enumerate real slurs or hate-speech vocabulary in
  // source code. This category is the weakest one in this fallback list as
  // a direct result — the real OpenAI moderation endpoint (used whenever
  // configured, see `moderation.service.ts`) is the primary defense for
  // hate-speech detection specifically; this is a narrow, phrase-pattern
  // backstop only, not a substitute for a real classifier.
  hate: [
    'subhuman race', 'exterminate all people who', 'gas the', 'ethnic cleansing of',
  ],
};

/** Returns every category whose phrase list matches the given text. An empty result means nothing in this conservative list matched — not a guarantee the content is safe. */
export function checkContentFallback(content: string): ModerationCategory[] {
  const normalized = content.trim().toLowerCase();
  return (Object.keys(CATEGORY_PHRASES) as ModerationCategory[]).filter((category) =>
    CATEGORY_PHRASES[category].some((phrase) => normalized.includes(phrase)),
  );
}
