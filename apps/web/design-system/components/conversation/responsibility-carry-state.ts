import type { PeopleResponsibilityDto } from '../../../lib/api/people-help';
import type { ResponsibilityDto, ResponsibilityEventDto } from '../../../lib/api/responsibilities';

export type CarryStateOwner = 'AUREUS' | 'MEMBER' | 'HUMAN_STEWARD' | 'THIRD_PARTY';

type ResponsibilityProjection = PeopleResponsibilityDto | ResponsibilityDto;

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
  level: ResponsibilityEventDto['evidenceLevel'];
}

export interface CarryStateWaiting {
  /** The real current holder. Never inferred from visual tone or copy. */
  holder: CarryStateOwner;
  /** The sourced condition/action being waited on, or a bounded status-derived fallback. */
  waitingOn: string;
  /** A real recorded follow-through attempt, never generic last activity relabeled as a chase. */
  lastFollowUpAt: string | null;
  /** A real scheduled next follow-through attempt, when the canonical contract has one. */
  nextFollowUpAt: string | null;
  /** The real obligation/responsibility due time, not presented as an invented response ETA. */
  dueAt: string | null;
  dueProvenance: 'REPORTED' | 'VERIFIED' | null;
  /** True only when canonical holder/review truth says the member has no current action. */
  noActionNeededFromMember: boolean;
}

/**
 * The authoritative "Visible Work" projection of one durable Responsibility
 * (UI Slice 2 — Production Carry State). Every field here is read or derived
 * from the real, conversation-scoped, server-persisted Responsibility — never
 * from conversation text. UI-004 adds `waiting`, which is likewise only a
 * projection of existing Responsibility/Step-5 follow-through truth.
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
  waiting: CarryStateWaiting | null;
  /**
   * The real authority/privacy boundary disclosure for this Responsibility's
   * kind, where one is required (e.g. OR-002 guidance's "Aureus guides; you
   * submit/attest" boundary) — null when no kind-specific disclosure applies.
   */
  authorityNote: string | null;
}

export function describeResponsibilityStatus(status: ResponsibilityProjection['status']): string {
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

export function describeStatusTone(status: ResponsibilityProjection['status']): CarryStateTone {
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

function describeAuthorityBoundary(responsibility: ResponsibilityProjection): string | null {
  if (responsibility.kind === 'OPPORTUNITY_APPLICATION_GUIDANCE') {
    return 'Aureus can guide you through the application. You remain in control of what you enter, attest to, and submit. Private to your Aureus account.';
  }
  return null;
}

const APPLICATION_GUIDANCE_NEEDS_YOU =
  'Return to finish the guided application, or tell Aureus you applied or are not interested.';
const GENERIC_NEEDS_YOU = 'Aureus needs something from you to continue — return to the conversation for details.';
const RESUME_GUIDANCE_NEEDS_YOU = 'Resume the guided application to continue — Aureus is ready when you are.';
const SATISFIED_FOLLOW_THROUGH_STATES = new Set([
  'SATISFIED_REPORTED',
  'SATISFIED_VERIFIED',
]);

function describeCarrying(responsibility: ResponsibilityProjection): string {
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

function describeNeedsYou(responsibility: ResponsibilityProjection): string {
  return responsibility.kind === 'OPPORTUNITY_APPLICATION_GUIDANCE'
    ? APPLICATION_GUIDANCE_NEEDS_YOU
    : GENERIC_NEEDS_YOU;
}

function describeNextAction(responsibility: ResponsibilityProjection): CarryStateNextAction | null {
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
    case 'PERSONAL_NEED_RESOLUTION':
      return "You'll know this is done when the underlying need has a recorded outcome — not merely when a handoff, offer, or follow-up happens.";
    default:
      return "You'll know this is done when Aureus records a verified outcome for this.";
  }
}

function describeEvidenceEvent(event: ResponsibilityEventDto): string {
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

function extractEvidence(responsibility: ResponsibilityProjection): CarryStateEvidenceEntry[] {
  return responsibility.events
    .filter((event) => event.type === 'ACTION_EVIDENCED' || event.type === 'COMPLETED')
    .map((event) => ({
      description: describeEvidenceEvent(event),
      occurredAt: event.occurredAt,
      level: event.evidenceLevel,
    }));
}

function computeLastActivityAt(responsibility: ResponsibilityProjection): string {
  const lastEventAt =
    responsibility.events.length > 0
      ? [...responsibility.events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0].occurredAt
      : null;
  return lastEventAt && lastEventAt > responsibility.updatedAt ? lastEventAt : responsibility.updatedAt;
}

type Step5FollowThroughProjection = {
  version: 'people-step5-obligation-v1';
  owner: CarryStateOwner;
  requiredAction: string;
  dueAt: string;
  dueProvenance: 'REPORTED' | 'VERIFIED';
  state: string;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  reportedSatisfiedAt: string | null;
  verifiedSatisfiedAt: string | null;
  reviewRequired: boolean;
};

function readStep5FollowThrough(successCriteria: unknown): Step5FollowThroughProjection | null {
  if (!successCriteria || typeof successCriteria !== 'object' || Array.isArray(successCriteria)) return null;
  const raw = (successCriteria as Record<string, unknown>).step5FollowThrough;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const owner = value.owner;
  if (
    value.version !== 'people-step5-obligation-v1' ||
    !['AUREUS', 'MEMBER', 'HUMAN_STEWARD', 'THIRD_PARTY'].includes(String(owner)) ||
    typeof value.requiredAction !== 'string' ||
    typeof value.dueAt !== 'string' ||
    !['REPORTED', 'VERIFIED'].includes(String(value.dueProvenance))
  ) {
    return null;
  }
  return {
    version: 'people-step5-obligation-v1',
    owner: owner as CarryStateOwner,
    requiredAction: value.requiredAction,
    dueAt: value.dueAt,
    dueProvenance: value.dueProvenance as 'REPORTED' | 'VERIFIED',
    state: typeof value.state === 'string' ? value.state : 'PENDING',
    lastAttemptAt: typeof value.lastAttemptAt === 'string' ? value.lastAttemptAt : null,
    nextAttemptAt: typeof value.nextAttemptAt === 'string' ? value.nextAttemptAt : null,
    reportedSatisfiedAt:
      typeof value.reportedSatisfiedAt === 'string' ? value.reportedSatisfiedAt : null,
    verifiedSatisfiedAt:
      typeof value.verifiedSatisfiedAt === 'string' ? value.verifiedSatisfiedAt : null,
    reviewRequired: value.reviewRequired === true,
  };
}

function followThroughIsSatisfied(followThrough: Step5FollowThroughProjection | null): boolean {
  return Boolean(followThrough && SATISFIED_FOLLOW_THROUGH_STATES.has(followThrough.state));
}

function statusHolder(status: ResponsibilityProjection['status']): CarryStateOwner | null {
  switch (status) {
    case 'WAITING_ON_AUREUS':
      return 'AUREUS';
    case 'WAITING_ON_USER':
      return 'MEMBER';
    case 'WAITING_ON_THIRD_PARTY':
      return 'THIRD_PARTY';
    default:
      return null;
  }
}

function satisfactionStartedAt(
  followThrough: Step5FollowThroughProjection | null,
): string | null {
  if (!followThroughIsSatisfied(followThrough) || !followThrough) return null;
  // Reported satisfaction is the first point at which this bounded Step-5
  // obligation stopped being a live wait. Later verification strengthens that
  // truth but must not move the cutoff forward and accidentally hide a broader
  // Responsibility wait that legitimately began in between.
  return followThrough.reportedSatisfiedAt ?? followThrough.verifiedSatisfiedAt;
}

function hasPostSatisfactionWaitEvidence(
  responsibility: ResponsibilityProjection,
  followThrough: Step5FollowThroughProjection | null,
): boolean {
  const satisfiedAt = satisfactionStartedAt(followThrough);
  if (!satisfiedAt || !statusHolder(responsibility.status)) return false;

  // Fail closed: updatedAt, messages, tool calls, and unrelated evidence do not
  // prove a new wait. The append-only Responsibility event must explicitly move
  // this Responsibility into its *current* WAITING_* status after satisfaction.
  return responsibility.events.some(
    (event) => event.toStatus === responsibility.status && event.occurredAt > satisfiedAt,
  );
}

function buildWaitingState(
  responsibility: ResponsibilityProjection,
  followThrough = readStep5FollowThrough(responsibility.successCriteria),
): CarryStateWaiting | null {
  const satisfied = followThroughIsSatisfied(followThrough);
  const postSatisfactionWait = satisfied && hasPostSatisfactionWaitEvidence(responsibility, followThrough);

  // Satisfaction closes only the bounded Step-5 wait. If the broader Personal
  // Need later enters a genuinely new wait, its Responsibility event chronology
  // is authoritative and that new wait must be honored. The old Step-5 action,
  // due date, and follow-up timestamps are never reused to describe the new wait.
  if (satisfied && !postSatisfactionWait) return null;
  const activeFollowThrough = satisfied ? null : followThrough;

  const holderFromStatus = statusHolder(responsibility.status);
  const followThroughIsWaiting =
    Boolean(activeFollowThrough) &&
    (activeFollowThrough!.state === 'WAITING' || activeFollowThrough!.owner === 'HUMAN_STEWARD');

  if (!holderFromStatus && !followThroughIsWaiting) return null;

  const holder = activeFollowThrough?.owner ?? holderFromStatus ?? 'AUREUS';
  const waitingOn =
    activeFollowThrough?.requiredAction ??
    (holder === 'MEMBER'
      ? 'Aureus is waiting for your next step.'
      : holder === 'AUREUS'
        ? 'Aureus has the next step.'
        : holder === 'HUMAN_STEWARD'
          ? 'A Human Steward has the next step.'
          : 'Aureus is waiting for an outside party to respond.');

  const noActionNeededFromMember = activeFollowThrough
    ? holder !== 'MEMBER' && activeFollowThrough.state !== 'DISPUTED' && !activeFollowThrough.reviewRequired
    : holder !== 'MEMBER';

  return {
    holder,
    waitingOn,
    lastFollowUpAt: activeFollowThrough?.lastAttemptAt ?? null,
    nextFollowUpAt: activeFollowThrough?.nextAttemptAt ?? null,
    dueAt: activeFollowThrough?.dueAt ?? (satisfied ? null : responsibility.dueAt ?? null),
    dueProvenance: activeFollowThrough?.dueProvenance ?? null,
    noActionNeededFromMember,
  };
}

/**
 * The bridge itself. Returns `null` when there is no durable Responsibility
 * to project. `hasActiveGuideSession` is real session presence — not derived
 * from status — because ACTIVE application guidance alone does not prove a
 * guide session is live in this browser.
 */
export function buildCarryState(
  responsibility: ResponsibilityProjection | null,
  hasActiveGuideSession = false,
): CarryState | null {
  if (!responsibility) return null;

  const isGuidanceAwaitingResume =
    responsibility.kind === 'OPPORTUNITY_APPLICATION_GUIDANCE' &&
    responsibility.status === 'ACTIVE' &&
    !hasActiveGuideSession;
  const followThrough = readStep5FollowThrough(responsibility.successCriteria);
  const currentStatusIsWaiting = statusHolder(responsibility.status) !== null;
  const satisfiedFollowThroughWithStaleWait =
    followThroughIsSatisfied(followThrough) &&
    currentStatusIsWaiting &&
    !hasPostSatisfactionWaitEvidence(responsibility, followThrough);

  return {
    workingOn: responsibility.objective,
    status: satisfiedFollowThroughWithStaleWait
      ? 'That follow-up is no longer waiting. The underlying need remains open.'
      : describeResponsibilityStatus(responsibility.status),
    tone: satisfiedFollowThroughWithStaleWait
      ? 'active'
      : describeStatusTone(responsibility.status),
    authorityNote: describeAuthorityBoundary(responsibility),
    carrying: isGuidanceAwaitingResume
      ? 'Aureus accepted this and is ready to continue — resume when you are ready.'
      : satisfiedFollowThroughWithStaleWait
        ? 'Aureus is still carrying the underlying need.'
        : describeCarrying(responsibility),
    needsYou: isGuidanceAwaitingResume
      ? RESUME_GUIDANCE_NEEDS_YOU
      : satisfiedFollowThroughWithStaleWait
        ? null
        : responsibility.status === 'WAITING_ON_USER'
          ? describeNeedsYou(responsibility)
          : null,
    nextAction: isGuidanceAwaitingResume
      ? { description: RESUME_GUIDANCE_NEEDS_YOU, owner: 'MEMBER' }
      : satisfiedFollowThroughWithStaleWait
        ? { description: 'Aureus continues carrying the underlying need.', owner: 'AUREUS' }
        : describeNextAction(responsibility),
    doneMeans: describeDoneMeans(responsibility.successCriteria),
    evidence: extractEvidence(responsibility),
    lastActivityAt: computeLastActivityAt(responsibility),
    waiting: isGuidanceAwaitingResume
      ? null
      : buildWaitingState(responsibility, followThrough),
  };
}
