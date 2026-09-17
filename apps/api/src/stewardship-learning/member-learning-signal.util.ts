import {
  StewardshipLearningCapabilityHint,
  StewardshipLearningSignalKind,
} from './stewardship-learning.types';

const REPETITION_FRICTION = [
  /\byou keep asking\b/i,
  /\byou(?:'ve| have) already asked\b/i,
  /\bi already told you\b/i,
  /\byou asked me this\b/i,
  /\bwhy (?:are|do) you (?:keep )?ask(?:ing)?\b/i,
];

const CORRECTION = [
  /\bthat(?:'s| is) (?:not right|wrong|incorrect)\b/i,
  /\byou got (?:that|it) wrong\b/i,
  /\bno[, ]+i (?:said|meant|told you)\b/i,
  /\bwhat i (?:said|meant) was\b/i,
];

const CAPABILITY_REQUEST = [
  /\bi wish (?:you|aureus) could\b/i,
  /\bi wish (?:you|aureus) would\b/i,
  /\bwhy can(?:'t| not) (?:you|aureus)\b/i,
  /\b(?:you|aureus) should be able to\b/i,
  /\bcould (?:you|aureus) (?:also|just)\b/i,
];

const SUGGESTION = [
  /\b(?:you|aureus) should\b/i,
  /\bit would be better if\b/i,
  /\bmaybe (?:you|aureus) could\b/i,
  /\bwhat if (?:you|aureus)\b/i,
  /\bi think (?:you|aureus) should\b/i,
];

const CAPABILITY_HINTS: Array<[
  StewardshipLearningCapabilityHint,
  RegExp[],
]> = [
  ['CALENDAR', [/\bcalendar\b/i, /\bschedule\b/i]],
  ['EMAIL', [/\be-?mail\b/i, /\bgmail\b/i, /\binbox\b/i]],
  ['MONEY', [/\bmoney\b/i, /\bincome\b/i, /\bcash\b/i]],
  ['BILLS', [/\bbill(?:s|ing)?\b/i, /\butility\b/i]],
  ['BENEFITS', [/\bbenefit(?:s)?\b/i, /\bsnap\b/i, /\bmedicaid\b/i, /\bssi\b/i]],
  ['EMPLOYMENT', [/\bjob(?:s)?\b/i, /\bemploy(?:ment|er)\b/i, /\bcareer\b/i]],
  ['BUSINESS', [/\bbusiness\b/i, /\bcustomer(?:s)?\b/i, /\bclient(?:s)?\b/i]],
  ['TRANSPORTATION', [/\btransport(?:ation)?\b/i, /\bbus\b/i, /\btrain\b/i, /\bride\b/i]],
  ['APPOINTMENTS', [/\bappointment(?:s)?\b/i, /\binterview(?:s)?\b/i]],
  ['DOCUMENTS', [/\bdocument(?:s)?\b/i, /\bpaperwork\b/i, /\bform(?:s)?\b/i]],
  ['REMINDERS', [/\bremind(?:er|ers| me)?\b/i, /\bnotification(?:s)?\b/i]],
  ['HUMAN_STEWARD', [/\bhuman steward\b/i, /\bsteward\b/i, /\bperson to help\b/i]],
  ['OPPORTUNITIES', [/\bopportunit(?:y|ies)\b/i, /\bopportunity center\b/i]],
];

export interface MemberLearningClassification {
  signalKind: StewardshipLearningSignalKind;
  capabilityHints: StewardshipLearningCapabilityHint[];
}

/**
 * Narrow deterministic detector for explicit member-authored product/stewardship
 * feedback. It intentionally prefers false negatives to quietly treating an
 * ordinary life request as product feedback. The original message stays the
 * canonical source and is never copied into the learning projection.
 */
export function classifyExplicitMemberLearningSignal(
  content: string,
): MemberLearningClassification | null {
  const normalized = content.trim();
  if (!normalized) return null;

  let signalKind: StewardshipLearningSignalKind | null = null;
  if (REPETITION_FRICTION.some((pattern) => pattern.test(normalized))) {
    signalKind = 'MEMBER_FRICTION';
  } else if (CORRECTION.some((pattern) => pattern.test(normalized))) {
    signalKind = 'MEMBER_CORRECTION';
  } else if (CAPABILITY_REQUEST.some((pattern) => pattern.test(normalized))) {
    signalKind = 'MEMBER_CAPABILITY_REQUEST';
  } else if (SUGGESTION.some((pattern) => pattern.test(normalized))) {
    signalKind = 'MEMBER_SUGGESTION';
  }

  if (!signalKind) return null;

  const capabilityHints = CAPABILITY_HINTS
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(normalized)))
    .map(([hint]) => hint);

  return { signalKind, capabilityHints };
}
