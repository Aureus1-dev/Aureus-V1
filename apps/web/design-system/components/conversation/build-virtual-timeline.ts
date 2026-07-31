import type { MessageDto } from '../../../lib/api/conversations';
import type { CoordinatedPlanDto } from '../../../lib/api/plan';
import type { GoalDto } from '../../../lib/api/goals';
import type { DocumentDto } from '../../../lib/api/documents';
import { planItemKey } from '../plan/PlanCard';

export type VirtualTimelineEntry =
  | { key: string; type: 'message'; timestamp: string; message: MessageDto }
  | { key: string; type: 'plan'; timestamp: string; plan: CoordinatedPlanDto }
  | { key: string; type: 'journey-update'; timestamp: string; goal: GoalDto }
  | { key: string; type: 'document'; timestamp: string; document: DocumentDto };

export interface BuiltPlan {
  plan: CoordinatedPlanDto;
  /**
   * When this plan was first observed as built, not a field the backend
   * provides (`CoordinatedPlanDto` has no timestamp of its own) — captured
   * once by the caller the moment a new plan object appears, so ordering
   * below has a real value to sort by rather than a fabricated one.
   */
  builtAt: string;
}

/**
 * Interleaves the real `MessageDto[]` transcript with synthetic entries
 * for a plan/journey-update/document that arose during THIS conversation —
 * the backend has no message↔plan/goal/document correlation
 * (`MessageDto` is plain text with no type discriminant), so this is a
 * frontend-only composition over state each already-existing context
 * fetches, not a new backend capability. Every entry keys off its own
 * source record's real id, never a message id, so re-renders never
 * duplicate a card as `PlanContext`/`JourneyContext`/
 * `ConnectedExperiencesContext` state (living, not one-shot events)
 * recomputes.
 *
 * Only a goal/document/plan whose own timestamp falls within this
 * conversation's span (at/after its first message) is shown — otherwise
 * every goal or document the member has ever had would replay inline on
 * every visit to `/conversation`, which is not "this conversation."
 * (One known approximation: switching to an older conversation can still
 * show a plan built more recently than that conversation's own messages,
 * since a plan is scoped to the member, not to one conversation — an
 * accepted limitation given the backend has no plan↔conversation link.)
 */
export function buildVirtualTimeline(
  messages: MessageDto[],
  plan: BuiltPlan | null,
  goals: GoalDto[],
  documents: DocumentDto[],
): VirtualTimelineEntry[] {
  const entries: VirtualTimelineEntry[] = messages.map((message) => ({
    key: `message:${message.id}`,
    type: 'message',
    timestamp: message.createdAt,
    message,
  }));

  const conversationStartedAt = messages[0]?.createdAt;
  if (!conversationStartedAt) return entries;

  if (plan && plan.builtAt >= conversationStartedAt) {
    entries.push({
      key: `plan:${planItemKey(plan.plan.primary)}`,
      type: 'plan',
      timestamp: plan.builtAt,
      plan: plan.plan,
    });
  }

  for (const goal of goals) {
    if (goal.createdAt >= conversationStartedAt) {
      entries.push({ key: `journey-update:${goal.id}`, type: 'journey-update', timestamp: goal.createdAt, goal });
    }
  }

  for (const document of documents) {
    if (document.uploadedAt >= conversationStartedAt) {
      entries.push({ key: `document:${document.id}`, type: 'document', timestamp: document.uploadedAt, document });
    }
  }

  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
