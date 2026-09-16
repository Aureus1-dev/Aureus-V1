import type {
  BusinessResponsibilityDto,
  ResponsibilityEvidenceLevel,
  ResponsibilityStatus,
} from '../../../lib/api/business-responsibilities';

/**
 * Step 5 — Business Owner Experience: the single place system truth becomes
 * human truth.
 *
 * Two rules govern every string below.
 *
 * 1. The owner never needs to learn an enum. `WAITING_ON_USER` is "Needs you";
 *    `ACTIVE` is "Aureus is carrying this".
 * 2. Language may never claim more certainty than the evidence receipt records.
 *    A manager attestation is stored by Step 4 as `REPORTED`, so it is spoken
 *    as *reported*, never as *verified*. There is deliberately no code path
 *    from a `REPORTED` receipt to the word "verified".
 */

export type OwnerGroup = 'needsYou' | 'carrying' | 'closed';

/** Statuses that are waiting on the person/business, not on Aureus. */
const NEEDS_YOU: ReadonlySet<ResponsibilityStatus> = new Set<ResponsibilityStatus>([
  'WAITING_ON_USER',
  'BLOCKED',
]);

/** Statuses where Aureus still holds the work. */
const CARRYING: ReadonlySet<ResponsibilityStatus> = new Set<ResponsibilityStatus>([
  'ACTIVE',
  'WAITING_ON_AUREUS',
  'WAITING_ON_THIRD_PARTY',
]);

/** Terminal statuses. */
const CLOSED: ReadonlySet<ResponsibilityStatus> = new Set<ResponsibilityStatus>([
  'COMPLETED',
  'CANCELLED',
  'RESPONSIBLY_EXHAUSTED',
]);

export function ownerGroupFor(status: ResponsibilityStatus): OwnerGroup {
  if (NEEDS_YOU.has(status)) return 'needsYou';
  if (CLOSED.has(status)) return 'closed';
  if (CARRYING.has(status)) return 'carrying';
  // An unknown future status is surfaced as carried work rather than hidden:
  // silently dropping a responsibility is worse than describing it plainly.
  return 'carrying';
}

/** Short human state, safe to show in a list row. */
export function statusLabel(status: ResponsibilityStatus): string {
  switch (status) {
    case 'WAITING_ON_USER':
      return 'Needs you';
    case 'BLOCKED':
      return 'Blocked — needs you';
    case 'ACTIVE':
      return 'Aureus is carrying this';
    case 'WAITING_ON_AUREUS':
      return 'Aureus is working on this';
    case 'WAITING_ON_THIRD_PARTY':
      return 'Waiting on someone outside the business';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'RESPONSIBLY_EXHAUSTED':
      return 'Aureus could not finish this';
    default:
      return 'In progress';
  }
}

type EvidenceBearing = { evidenceLevel: ResponsibilityEvidenceLevel | null };

/**
 * The strongest evidence level recorded anywhere in the lifecycle, or null
 * when nothing has been recorded. VERIFIED outranks REPORTED.
 */
export function strongestEvidenceLevel(
  events: ReadonlyArray<EvidenceBearing>,
): ResponsibilityEvidenceLevel | null {
  let seenReported = false;
  for (const event of events) {
    if (event.evidenceLevel === 'VERIFIED') return 'VERIFIED';
    if (event.evidenceLevel === 'REPORTED') seenReported = true;
  }
  return seenReported ? 'REPORTED' : null;
}

export interface CompletionStatement {
  /** Short headline, e.g. "Completed — reported". Never implies verification unless VERIFIED. */
  headline: string;
  /** Plain-language detail the owner can act on. Always present. */
  detail: string;
  /** True only when the receipt records independent verification. */
  verified: boolean;
}

/**
 * Who reported a completion, spoken only when the receipt actually says so.
 * Step 4 records a manager attestation as
 * `sourceRecordType: 'OrganizationMemberAttestation'` +
 * `sourceState: 'MANAGER_CONFIRMED'`. Absent those exact markers the
 * attribution is omitted rather than guessed.
 */
function reporterDescription(lifecycle: CompletionInput['lifecycle']): string | null {
  const attestation = lifecycle.find(
    (event) =>
      event.evidenceLevel === 'REPORTED' &&
      event.sourceRecordType === 'OrganizationMemberAttestation' &&
      event.sourceState === 'MANAGER_CONFIRMED',
  );
  return attestation ? 'a business manager' : null;
}

/**
 * Truthful completion language derived only from the canonical evidence
 * receipt. Never call this with notification copy or conversation text.
 */
export interface CompletionInput {
  status: ResponsibilityStatus;
  /**
   * Any evidence-bearing lifecycle record. Deliberately structural: the list
   * endpoint calls these `events` and the evidence receipt calls them
   * `lifecycle`, and only these three fields may influence the language.
   */
  lifecycle: ReadonlyArray<{
    evidenceLevel: ResponsibilityEvidenceLevel | null;
    sourceRecordType?: string | null;
    sourceState?: string | null;
  }>;
}

export function describeCompletion(receipt: CompletionInput): CompletionStatement {
  const level = strongestEvidenceLevel(receipt.lifecycle);

  if (receipt.status === 'CANCELLED') {
    return {
      headline: 'Cancelled',
      detail: 'This work was cancelled. Aureus is no longer carrying it.',
      verified: false,
    };
  }

  if (receipt.status === 'RESPONSIBLY_EXHAUSTED') {
    return {
      headline: 'Could not be finished',
      detail:
        'Aureus stopped because no further step it is allowed to take would move this forward. Nothing here claims the outcome happened.',
      verified: false,
    };
  }

  if (receipt.status !== 'COMPLETED') {
    return {
      headline: statusLabel(receipt.status),
      detail: 'This work is still open.',
      verified: false,
    };
  }

  if (level === 'VERIFIED') {
    return {
      headline: 'Completed — verified',
      detail: 'Aureus independently verified this result against a recorded source.',
      verified: true,
    };
  }

  if (level === 'REPORTED') {
    const reporter = reporterDescription(receipt.lifecycle);
    return {
      headline: 'Completed — reported',
      detail: reporter
        ? `Completion was confirmed by ${reporter}. Aureus has not independently verified it.`
        : 'Completion was reported. Aureus has not independently verified it.',
      verified: false,
    };
  }

  return {
    headline: 'Completed — no evidence recorded',
    detail:
      'This was marked complete, but no supporting evidence has been recorded. Aureus cannot confirm the result.',
    verified: false,
  };
}

/** Evidence language for a responsibility that is not yet closed. */
export function describeEvidencePresence(
  lifecycle: ReadonlyArray<EvidenceBearing>,
): string {
  const level = strongestEvidenceLevel(lifecycle);
  if (level === 'VERIFIED') return 'Verified evidence has been recorded.';
  if (level === 'REPORTED')
    return 'Progress has been reported. Aureus has not independently verified it.';
  return 'No evidence has been recorded yet.';
}

/** The promise/criterion Step 3 stored inside successCriteria, if present. */
export function promiseOf(responsibility: Pick<BusinessResponsibilityDto, 'successCriteria'>): {
  promise: string | null;
  criterion: string | null;
} {
  const criteria = responsibility.successCriteria;
  if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) {
    return { promise: null, criterion: null };
  }
  const record = criteria as Record<string, unknown>;
  return {
    promise: typeof record.promise === 'string' ? record.promise : null,
    criterion: typeof record.criterion === 'string' ? record.criterion : null,
  };
}
