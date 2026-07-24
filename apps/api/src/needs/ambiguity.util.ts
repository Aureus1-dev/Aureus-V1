/**
 * Gate C (C2: Clarification). A deterministic — not AI-judged — ambiguity
 * check on a member's initial stated need, so "an ambiguous input reliably
 * produces a clarifying question" is a guarantee, not a probabilistic LLM
 * behavior. Matches the Orchestrator's established preference (ADR-015) for
 * thin, deterministic decisions over a free-form model judgment call
 * wherever reliability is required.
 */
const MIN_MEANINGFUL_LENGTH = 15;

const GENERIC_PHRASES = new Set([
  'help', 'i need help', 'not sure', 'something', 'idk', "i don't know", 'i dont know', 'nothing specific', 'i need something',
]);

export function isAmbiguousNeed(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  if (normalized.length === 0) return true;
  if (GENERIC_PHRASES.has(normalized)) return true;
  return normalized.length < MIN_MEANINGFUL_LENGTH;
}

export const CLARIFYING_QUESTION =
  "Could you tell me a little more about what's going on? The more specific you can be, the better I can help you.";
