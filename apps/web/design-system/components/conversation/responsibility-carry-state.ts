import type { PeopleResponsibilityDto, PeopleResponsibilityEventDto } from '../../../lib/api/people-help';

export type CarryStateOwner = 'AUREUS' | 'MEMBER' | 'THIRD_PARTY';

export interface CarryStateNextAction {
  description: string;
  owner: CarryStateOwner;
}

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
  carrying: string;
  needsYou: string | null;
  nextAction: CarryStateNextAction | null;
  doneMeans: string;
  evidence: CarryStateEvidenceEntry[];
  lastActivityAt: string | null;
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
 * The member-reported application outcome, truthfully labeled — never
 * "verified"/"approved" — scanning events for the terminal COMPLETED
 * evidence OR-002 actually writes (`ResponsibilitiesService.
 * completeApplicationGuidance`, evidenceLevel REPORTED, sourceRecordType
 * 'SavedOpportunity'). Returns null when no such completion evidence exists.
 */
export function describeReportedOutcome(responsibility: PeopleResponsibilityDto): string | null {
  const completion = [...responsibility.events].reverse().find((event) => event.type === 'COMPLETED');

  if (
    completion?.sourceRecordType !== 'SavedOpportunity' ||
    completion.evidenceLevel !== 'REPORTED' ||
    !completion.sourceState
  ) {
    return null;
  }

  if (completion.sourceState === 'APPLIED') {
    return 'Application status: submitted/applied — reported by you.';
  }

  if (completion.sourceState === 'NOT_INTERESTED') {
    return 'Application status: not continuing — reported by you.';
  }

  return `Application status: ${completion.sourceState} — reported by you.`;
}

const APPLICATION_GUIDANCE_NEEDS_YOU =
  'Return to finish the guided application, or tell Aureus you applied or are not interested.';
const GENERIC_NEEDS_YOU = 'Aureus needs something from you to continue — return to the conversation for details.';

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
 */
export function buildCarryState(responsibility: PeopleResponsibilityDto | null): CarryState | null {
  if (!responsibility) return null;

  return {
    workingOn: responsibility.objective,
    status: describeResponsibilityStatus(responsibility.status),
    carrying: describeCarrying(responsibility),
    needsYou: responsibility.status === 'WAITING_ON_USER' ? describeNeedsYou(responsibility) : null,
    nextAction: describeNextAction(responsibility),
    doneMeans: describeDoneMeans(responsibility.successCriteria),
    evidence: extractEvidence(responsibility),
    lastActivityAt: computeLastActivityAt(responsibility),
  };
}
