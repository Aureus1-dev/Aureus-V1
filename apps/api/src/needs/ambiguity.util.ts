/**
 * Gate C (C2: Clarification). A deterministic ambiguity check on a member's
 * initial stated need. Brevity is not the same thing as ambiguity: "money",
 * "rent", "food", "job", and similar one-word answers are legitimate first
 * descriptions of a real problem and must enter the relevant help path rather
 * than being rejected for failing a character-count test.
 */
const MIN_MEANINGFUL_LENGTH = 15;

const GENERIC_PHRASES = new Set([
  'help',
  'i need help',
  'not sure',
  'something',
  'idk',
  "i don't know",
  'i dont know',
  'nothing specific',
  'i need something',
]);

/**
 * Concise domain-bearing needs that are meaningful on their own. This is not
 * an eligibility taxonomy and does not decide what help a member receives; it
 * only prevents the clarification gate from treating an understandable need
 * category as if the member had said nothing useful.
 */
const CONCISE_MEANINGFUL_NEEDS = new Set([
  'money',
  'cash',
  'income',
  'bills',
  'debt',
  'rent',
  'mortgage',
  'housing',
  'homeless',
  'food',
  'groceries',
  'job',
  'work',
  'employment',
  'benefits',
  'healthcare',
  'health care',
  'doctor',
  'medicine',
  'medication',
  'transportation',
  'transport',
  'car',
  'childcare',
  'child care',
  'school',
  'education',
  'legal',
  'lawyer',
  'safety',
  'utilities',
  'electric',
  'gas',
  'water',
]);

export function isAmbiguousNeed(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  if (normalized.length === 0) return true;
  if (GENERIC_PHRASES.has(normalized)) return true;
  if (CONCISE_MEANINGFUL_NEEDS.has(normalized)) return false;
  return normalized.length < MIN_MEANINGFUL_LENGTH;
}

export const CLARIFYING_QUESTION =
  "Could you tell me a little more about what's going on? The more specific you can be, the better I can help you.";
