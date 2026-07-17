/**
 * Calm, natural member-facing status language for the Steward Workspace
 * (DOMAIN-007 Founder guidance — "Do not expose FPB-004's internal
 * conversation lifecycle as technical or bureaucratic stage names... Do
 * not turn the Steward relationship into a visible workflow engine.").
 * These are presentation copy only — they carry no state of their own
 * and map loosely onto FPB-004's internal lifecycle stages without
 * naming them.
 */
export const STEWARD_STATUS = {
  listening: 'Listening',
  understanding: 'Understanding what you need',
  preparing: 'Preparing something for you',
  readyForReview: 'Ready for your review',
  waitingForDecision: 'Waiting for your decision',
} as const;
