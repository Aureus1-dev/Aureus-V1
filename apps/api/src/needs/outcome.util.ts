/**
 * Member Arrival outcome check. This remains distinct from ambiguity, but a
 * member who has already supplied either an explicit goal or a concrete
 * hardship with an obvious stabilizing default must not be asked the generic
 * arrival question again. The Steward can respond to the real need and ask a
 * narrower question only when it is actually useful.
 */
const OUTCOME_INDICATOR_PHRASES = [
  'i need', 'i want', 'i would like', "i'd like", 'i wanna', 'i wish',
  'looking for', 'trying to', 'hoping to', 'want to', 'need to',
  'help me', 'so i can', 'so that i can', 'in order to',
  'i have to', "i've got to", 'need help with', 'need help finding',
];

const CONCRETE_HARDSHIP_PHRASES = [
  'past due',
  'overdue',
  'being shut off',
  'getting shut off',
  'shut off',
  'disconnected',
  'being disconnected',
  'behind on',
  "can't pay",
  'cannot pay',
  'unable to pay',
  'eviction',
  'being evicted',
  'getting evicted',
  'foreclosure',
  'being foreclosed',
  'repossession',
  'being repossessed',
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
  if (CONCRETE_HARDSHIP_PHRASES.some((phrase) => normalized.includes(phrase))) return false;
  return !OUTCOME_INDICATOR_PHRASES.some((phrase) => normalized.includes(phrase));
}

export const OUTCOME_QUESTION = 'What would help most right now?';
