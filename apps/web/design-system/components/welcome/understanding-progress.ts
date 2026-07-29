import type { MessageDto } from '../../../lib/api/conversations';

/**
 * Gate C (C2: Clarification). Mirrors
 * `apps/api/src/needs/ambiguity.util.ts`'s `CLARIFYING_QUESTION` exactly —
 * a fixed, short, deliberately distinctive sentence, the same fact this
 * codebase's own e2e suite already relies on (see `ai.e2e.spec.ts`'s
 * `/tell me a little more/i` assertion).
 */
export const CLARIFYING_QUESTION =
  "Could you tell me a little more about what's going on? The more specific you can be, the better I can help you.";

/**
 * Member Arrival — Steward Experience migration (Founder-approved
 * wording). Mirrors `apps/api/src/needs/outcome.util.ts`'s
 * `OUTCOME_QUESTION` exactly.
 */
export const OUTCOME_QUESTION = 'What would help most right now?';

/**
 * Gate C (C3: Urgency assessment). A crisis redirect always names the 988
 * Suicide & Crisis Lifeline — the same signal `ai.e2e.spec.ts` already
 * trusts as the contract for "this was the crisis redirect," reused here
 * rather than a brittle exact match against the full message, since this
 * one fact must never be missed even if the surrounding wording changes.
 */
export function isCrisisRedirect(content: string): boolean {
  return content.includes('988');
}

export type UnderstandingPhase =
  | { kind: 'collecting' }
  | { kind: 'outcome-question' }
  | { kind: 'clarifying'; priorMessage: string }
  | { kind: 'crisis'; priorMessage: string }
  | { kind: 'understood'; originalNeed: string; reflection: string };

/**
 * Member Arrival — Steward Experience migration. A pure, deterministic
 * read of "what is Aureus's Gate C pipeline asking for right now" from
 * the arrival conversation's own timeline — never a second, separately
 * tracked phase of local state to keep in sync, since the conversation
 * itself (already routed through `ConversationsService.ask()`, so crisis
 * detection, clarification, and the outcome question cannot be bypassed)
 * is the single source of truth for what was actually said.
 */
export function deriveUnderstandingPhase(timeline: MessageDto[]): UnderstandingPhase {
  const lastAssistant = [...timeline].reverse().find((m) => m.role === 'ASSISTANT');
  if (!lastAssistant) {
    return { kind: 'collecting' };
  }
  if (lastAssistant.content === OUTCOME_QUESTION) {
    return { kind: 'outcome-question' };
  }
  if (lastAssistant.content === CLARIFYING_QUESTION) {
    return { kind: 'clarifying', priorMessage: lastAssistant.content };
  }
  if (isCrisisRedirect(lastAssistant.content)) {
    return { kind: 'crisis', priorMessage: lastAssistant.content };
  }
  const originalNeed = timeline.find((m) => m.role === 'USER')?.content ?? '';
  return { kind: 'understood', originalNeed, reflection: lastAssistant.content };
}
