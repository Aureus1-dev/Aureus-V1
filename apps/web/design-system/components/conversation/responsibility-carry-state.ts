import type { PeopleResponsibilityDto, PeopleResponsibilityEventDto } from '../../../lib/api/people-help';

export type CarryStateOwner = 'AUREUS' | 'MEMBER' | 'THIRD_PARTY';

export interface CarryStateNextAction {
  description: string;
  owner: CarryStateOwner;
}

/**
 * A presentation-agnostic classification of lifecycle status, for selecting
 * a visual tone (e.g. a status accent) — never rendered as text itself.
 * `describeResponsibilityStatus` remains the only source of the actual
 * displayed words, so a consumer keying styling off `tone` can never
 * accidentally leak an internal enum name to the member.
 */
export type CarryStateTone = 'active' | 'attention' | 'blocked' | 'complete' | 'neutral';

export interface CarryStateEvidenceEntry {
  description: string;
  occurredAt: string;
  level: PeopleResponsibilityEventDto['evidenceLevel'];
}

/**
 * The authoritative "Visible Work" projection of one durable Responsibility
 * (UI Slice 2 — Production Carry State). Every field here is read or derived
 * from `PeopleResponsibilityDto` — the real, conversation-scoped, already
 * server-persisted record `getActivePeopleApplicationHelp` returns — never
 * from conversation text. `ConversationSurface` falls back to its own
 * conversation-derived signals only when `buildCarryState` returns `null`
 * (no durable Responsibility exists yet for this conversation).
 */
export interface CarryState {
  workingOn: string;
  status: string;
  /** Visual-only classification of `status` — see `CarryStateTone`. */
  tone: CarryStateTone;
  carrying: string;
  needsYou: string | null;
  nextAction: CarryStateNextAction | null;
  doneMeans: string;
  evidence: CarryStateEvidenceEntry[];
  lastActivityAt: string | null;
  /**
   * The real authority/privacy boundary disclosure for this Responsibility's
   * kind, where one is required (e.g. OR-002 guidance's "Aureus guides; you
   * submit/attest" boundary) — null when no kind-specific disclosure applies.
   */
  authorityNote: string | null;
}

/**
 * Plain-language lifecycle status. The single shared source `Responsibility
 * ProgressCard` and the Visible Work bridge both read, so the two surfaces
 * can never describe the same Responsibility differently.
 */
export function describeResponsibilityStatus(status: PeopleResponsibilityDto['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'We are working on this together now.';
    case 'WAITING_ON_USER':
      return 'Paused for you. Come back when you are ready and Aureus will pick it up here.';
    case 'WAITING_ON_AUREUS':
      return 'Aureus has the next step.';
    case 'WAITING_ON_THIRD_PARTY':
      return 'Waiting on an outside party.';
    case 'BLOCKED':
      return 'Aureus found a blocker and is keeping the work visible.';
    case 'COMPLETED':
      return 'This bounded responsibility is complete.';
    case 'RESPONSIBLY_EXHAUSTED':
      return 'No responsible path remains right now.';
    case 'CANCELLED':
      return 'This responsibility was cancelled.';
  }
}

/**
 * Visual-only tone for `status` — used to select an accent, never text.
 * Kept alongside `describeResponsibilityStatus` so the two can never drift:
 * every branch here corresponds 1:1 with a branch there.
 */
export function describeStatusTone(status: PeopleResponsibilityDto['status']): CarryStateTone {
  switch (status) {
    case 'ACTIVE':
    case 'WAITING_ON_AUREUS':
      return 'active';
    case 'WAITING_ON_USER':
      return 'attention';
    case 'WAITING_ON_THIRD_PARTY':
      return 'neutral';
    case 'BLOCKED':
    case 'RESPONSIBLY_EXHAUSTED':
      return 'blocked';
    case 'COMPLETED':
      return 'complete';
    case 'CANCELLED':
      return 'neutral';
  }
}

/**
 * The real authority/privacy boundary disclosure, by kind. Preserves the
 * exact commitments OR-002 §5 requires stay visible wherever this
 * Responsibility's state is shown ("Aureus guides; the member submits/
 * attests," "Private to your Aureus account") — moved here from
 * `ResponsibilityProgressCard` so it is derived once, not re-authored per
 * presentation surface.
 */
function describeAuthorityBoundary(responsibility: PeopleResponsibilityDto): string | null {
  if (responsibility.kind === 'OPPORTUNITY_APPLICATION_GUIDANCE') {
    return 'Aureus can guide you through the application. You remain in control of what you enter, attest to, and submit. Private to your Aureus account.';
  }
  return null;
}

const APPLICATION_GUIDANCE_NEEDS_YOU =
  'Return to finish the guided application, or tell Aureus you applied or are not interested.';
const GENERIC_NEEDS_YOU = 'Aureus needs something from you to continue — return to the conversation for details.';
// The backend's ACTIVE status means only "non-terminal, no wait condition
// recorded" — it is not a live claim that a guide session is open in this
// browser right now. OR-002 accepts the Responsibility before the guide
// session necessarily exists (`PeopleHelpService.start()`), and a member can
// also leave/return without an explicit pause, so "ACTIVE + no live session"
// is a real, valid state the existing UI already requires a Resume click
// for (`ResponsibilityProgressCard`'s `canResume`/`onResume` gate). Claiming
// "Guiding you" or an AUREUS-owned next action here would describe execution
// that is not actually occurring (independent audit, PR #160).
const RESUME_GUIDANCE_NEEDS_YOU = 'Resume the guided application to continue — Aureus is ready when you are.';

function describeCarrying(responsibility: PeopleResponsibilityDto): string {
  const isApplicationGuidance = responsibility.kind === 'OPPORTUNITY_APPLICATION_GUIDANCE';
  switch (responsibility.status) {
    case 'ACTIVE':
      return isApplicationGuidance
        ? 'Guiding you through the verified application.'
        : 'Aureus is actively working on this.';
    case 'WAITING_ON_AUREUS':
      return 'Aureus is working on the next step.';
    case 'WAITING_ON_USER':
      return 'Paused — nothing further until you return.';
    case 'WAITING_ON_THIRD_PARTY':
      return 'Waiting on a response from an outside party.';
    case 'BLOCKED':
      return 'Blocked — Aureus is keeping this visible rather than dropping it.';
    case 'COMPLETED':
      return 'Completed — nothing further to carry.';
    case 'RESPONSIBLY_EXHAUSTED':
      return 'Aureus could not responsibly continue this further.';
    case 'CANCELLED':
      return 'Cancelled — no longer active.';
  }
}

function describeNeedsYou(responsibility: PeopleResponsibilityDto): string {
  return responsibility.kind === 'OPPORTUNITY_APPLICATION_GUIDANCE'
    ? APPLICATION_GUIDANCE_NEEDS_YOU
    : GENERIC_NEEDS_YOU;
}

function describeNextAction(responsibility: PeopleResponsibilityDto): CarryStateNextAction | null {
  switch (responsibility.status) {
    case 'ACTIVE':
      return {
        description:
          responsibility.kind === 'OPPORTUNITY_APPLICATION_GUIDANCE'
            ? 'Continue the guided application.'
            : 'Aureus continues this work.',
        owner: 'AUREUS',
      };
    case 'WAITING_ON_AUREUS':
      return { description: 'Aureus continues the next step.', owner: 'AUREUS' };
    case 'WAITING_ON_USER':
      return { description: describeNeedsYou(responsibility), owner: 'MEMBER' };
    case 'WAITING_ON_THIRD_PARTY':
      return { description: 'Waiting on an outside party to respond.', owner: 'THIRD_PARTY' };
    case 'BLOCKED':
      return { description: 'Aureus is reassessing how to responsibly continue.', owner: 'AUREUS' };
    case 'COMPLETED':
    case 'RESPONSIBLY_EXHAUSTED':
    case 'CANCELLED':
      return null;
  }
}

/**
 * `successCriteria` is a per-kind JSON contract the backend already writes
 * at acceptance time (`responsibilities.service.ts` — `OPPORTUNITY_DECISION_
 * CRITERIA` / `APPLICATION_GUIDANCE_CRITERIA`), not free text — its `type`
 * is a small controlled vocabulary. An unrecognized/missing type falls back
 * to a generic, still-honest sentence rather than guessing specifics the
 * contract doesn't actually state.
 */
function describeDoneMeans(successCriteria: unknown): string {
  const type =
    successCriteria && typeof successCriteria === 'object' && 'type' in successCriteria
      ? (successCriteria as { type?: unknown }).type
      : null;

  switch (type) {
    case 'APPLICATION_GUIDANCE_MEMBER_OUTCOME_RECORDED':
      return "You'll know this is done when you tell Aureus you applied or decided not to continue.";
    case 'OPPORTUNITY_DECISION_RECORDED':
      return "You'll know this is done when you've recorded a decision about this opportunity.";
    default:
      return "You'll know this is done when Aureus records a verified outcome for this.";
  }
}

function describeEvidenceEvent(event: PeopleResponsibilityEventDto): string {
  if (event.sourceRecordType === 'SavedOpportunity' && event.sourceState) {
    const outcome =
      event.sourceState === 'APPLIED'
        ? 'submitted/applied'
        : event.sourceState === 'NOT_INTERESTED'
          ? 'not continuing'
          : event.sourceState;
    return `You reported: ${outcome}${event.evidenceLevel ? ` (${event.evidenceLevel.toLowerCase()})` : ''}.`;
  }
  return `${event.sourceSystem ?? 'Aureus'} recorded a status update${
    event.evidenceLevel ? ` (${event.evidenceLevel.toLowerCase()})` : ''
  }.`;
}

/**
 * Only events that actually carry proof — `ACTION_EVIDENCED`/`COMPLETED` —
 * become "Evidence." A tool call succeeding, a message being sent, or any
 * other event type is never described as evidence (PA-021 §5/§17.3: a tool
 * response or model claim is not completion evidence by itself).
 */
function extractEvidence(responsibility: PeopleResponsibilityDto): CarryStateEvidenceEntry[] {
  return responsibility.events
    .filter((event) => event.type === 'ACTION_EVIDENCED' || event.type === 'COMPLETED')
    .map((event) => ({
      description: describeEvidenceEvent(event),
      occurredAt: event.occurredAt,
      level: event.evidenceLevel,
    }));
}

function computeLastActivityAt(responsibility: PeopleResponsibilityDto): string {
  const lastEventAt =
    responsibility.events.length > 0
      ? [...responsibility.events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0].occurredAt
      : null;
  return lastEventAt && lastEventAt > responsibility.updatedAt ? lastEventAt : responsibility.updatedAt;
}

/**
 * The bridge itself. Returns `null` when there is no durable Responsibility
 * to project (the caller must fall back to its own honest, conversation-
 * scoped signals) — never a fabricated "nothing to see" object standing in
 * for genuinely absent data.
 *
 * `hasActiveGuideSession` is real session presence — not derived from
 * `status` — because `status === 'ACTIVE'` alone does not prove Aureus is
 * currently guiding anything in this session; only a live
 * `GuidedApplicationSession` does.
 */
export function buildCarryState(
  responsibility: PeopleResponsibilityDto | null,
  hasActiveGuideSession = false,
): CarryState | null {
  if (!responsibility) return null;

  const isGuidanceAwaitingResume =
    responsibility.kind === 'OPPORTUNITY_APPLICATION_GUIDANCE' &&
    responsibility.status === 'ACTIVE' &&
    !hasActiveGuideSession;

  return {
    workingOn: responsibility.objective,
    status: describeResponsibilityStatus(responsibility.status),
    tone: describeStatusTone(responsibility.status),
    authorityNote: describeAuthorityBoundary(responsibility),
    carrying: isGuidanceAwaitingResume
      ? 'Aureus accepted this and is ready to continue — resume when you are ready.'
      : describeCarrying(responsibility),
    needsYou: isGuidanceAwaitingResume
      ? RESUME_GUIDANCE_NEEDS_YOU
      : responsibility.status === 'WAITING_ON_USER'
        ? describeNeedsYou(responsibility)
        : null,
    nextAction: isGuidanceAwaitingResume
      ? { description: RESUME_GUIDANCE_NEEDS_YOU, owner: 'MEMBER' }
      : describeNextAction(responsibility),
    doneMeans: describeDoneMeans(responsibility.successCriteria),
    evidence: extractEvidence(responsibility),
    lastActivityAt: computeLastActivityAt(responsibility),
  };
}
