/**
 * Member Arrival — Steward Experience migration (Founder-approved wording:
 * "What would help most right now?"). A deterministic — not AI-judged —
 * check on whether a member's stated need already implies the result they
 * want, mirroring `isAmbiguousNeed()`'s reliability-over-inference
 * preference (ADR-015): "reliably asks" is a guarantee only a
 * deterministic check can make.
 *
 * This is a distinct question from ambiguity. A need can be perfectly
 * specific — "My landlord gave me an eviction notice for Friday" — and
 * still never state what result the member actually wants (stay housed?
 * find new housing? legal help to fight it?). The outcome question is
 * asked once, only when that result genuinely isn't already there in
 * their own words — never mechanically after every message.
 */
const OUTCOME_INDICATOR_PHRASES = [
  'i need', 'i want', 'i would like', "i'd like", 'i wanna', 'i wish',
  'looking for', 'trying to', 'hoping to', 'want to', 'need to',
  'help me', 'so i can', 'so that i can', 'in order to',
  'i have to', "i've got to", 'need help with', 'need help finding',
];

// A direct interface command ("Show me my opportunities", "Take me to my
// journey") is already answerable by the Steward's existing Dynamic
// Screen Orchestration tool-calling (DOMAIN-007) — asking what would help
// most would interrupt a request the member already made plainly.
const COMMAND_PREFIXES = [
  'show me', 'take me', 'go to', 'open', 'navigate', 'let me see', 'pull up', 'bring up',
];

export function isOutcomeUnclear(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  if (normalized.length === 0) return true;
  // A direct question ("What is a Journey?", "How do I update my
  // profile?") already has an answerable shape of its own — Aureus should
  // answer it, not ask what would help, which would read as deflecting a
  // plain question rather than listening to it.
  if (normalized.endsWith('?')) return false;
  if (COMMAND_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
  return !OUTCOME_INDICATOR_PHRASES.some((phrase) => normalized.includes(phrase));
}

export const OUTCOME_QUESTION = 'What would help most right now?';
