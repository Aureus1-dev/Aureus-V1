/**
 * Member Arrival outcome check. This remains distinct from ambiguity, but a
 * member who has already answered "What would help most right now?" with a
 * recognizable category such as "money" must not be asked the same question
 * again. The Steward can orient immediately and ask one narrower question.
 */
const OUTCOME_INDICATOR_PHRASES = [
  'i need', 'i want', 'i would like', "i'd like", 'i wanna', 'i wish',
  'looking for', 'trying to', 'hoping to', 'want to', 'need to',
  'help me', 'so i can', 'so that i can', 'in order to',
  'i have to', "i've got to", 'need help with', 'need help finding',
];

const COMMAND_PREFIXES = [
  'show me', 'take me', 'go to', 'open', 'navigate', 'let me see', 'pull up', 'bring up',
];

const CONCISE_NEEDS_WITH_ACTIONABLE_DEFAULTS = new Set([
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

export function isOutcomeUnclear(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  if (normalized.length === 0) return true;
  if (normalized.endsWith('?')) return false;
  if (COMMAND_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
  if (CONCISE_NEEDS_WITH_ACTIONABLE_DEFAULTS.has(normalized)) return false;
  return !OUTCOME_INDICATOR_PHRASES.some((phrase) => normalized.includes(phrase));
}

export const OUTCOME_QUESTION = 'What would help most right now?';
