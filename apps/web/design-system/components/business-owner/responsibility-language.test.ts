import {
  describeCompletion,
  describeEvidencePresence,
  ownerGroupFor,
  promiseOf,
  statusLabel,
  strongestEvidenceLevel,
} from './responsibility-language';
import type { ResponsibilityStatus } from '../../../lib/api/business-responsibilities';

type Lifecycle = Parameters<typeof describeCompletion>[0]['lifecycle'];

function lifecycle(
  entries: Array<{
    evidenceLevel?: 'REPORTED' | 'VERIFIED' | null;
    sourceRecordType?: string | null;
    sourceState?: string | null;
  }>,
): Lifecycle {
  return entries.map((entry, index) => ({
    eventId: `event-${index}`,
    type: 'ACTION_EVIDENCED',
    actorClass: 'SYSTEM' as const,
    actorUserId: null,
    occurredAt: '2026-09-13T10:00:00.000Z',
    fromStatus: null,
    toStatus: null,
    sourceSystem: 'AUREUS_BUSINESS',
    sourceRecordType: entry.sourceRecordType ?? null,
    sourceRecordId: null,
    sourceState: entry.sourceState ?? null,
    evidenceLevel: entry.evidenceLevel ?? null,
  }));
}

/** The manager attestation Step 4 actually records on `POST /:id/complete`. */
const MANAGER_ATTESTATION = lifecycle([
  {
    evidenceLevel: 'REPORTED',
    sourceRecordType: 'OrganizationMemberAttestation',
    sourceState: 'MANAGER_CONFIRMED',
  },
]);

describe('owner grouping', () => {
  it('routes work waiting on the business into Needs you', () => {
    expect(ownerGroupFor('WAITING_ON_USER')).toBe('needsYou');
    expect(ownerGroupFor('BLOCKED')).toBe('needsYou');
  });

  it('routes work Aureus still holds into carrying', () => {
    expect(ownerGroupFor('ACTIVE')).toBe('carrying');
    expect(ownerGroupFor('WAITING_ON_AUREUS')).toBe('carrying');
    expect(ownerGroupFor('WAITING_ON_THIRD_PARTY')).toBe('carrying');
  });

  it('routes terminal work into closed', () => {
    expect(ownerGroupFor('COMPLETED')).toBe('closed');
    expect(ownerGroupFor('CANCELLED')).toBe('closed');
    expect(ownerGroupFor('RESPONSIBLY_EXHAUSTED')).toBe('closed');
  });

  it('never hides an unrecognized future status', () => {
    expect(ownerGroupFor('SOMETHING_NEW' as ResponsibilityStatus)).toBe('carrying');
  });
});

describe('status language', () => {
  it('translates internal enums into owner language', () => {
    expect(statusLabel('WAITING_ON_USER')).toBe('Needs you');
    expect(statusLabel('ACTIVE')).toBe('Aureus is carrying this');
  });

  it('never leaks an enum name to the owner', () => {
    const statuses: ResponsibilityStatus[] = [
      'ACTIVE',
      'WAITING_ON_AUREUS',
      'WAITING_ON_USER',
      'WAITING_ON_THIRD_PARTY',
      'BLOCKED',
      'COMPLETED',
      'RESPONSIBLY_EXHAUSTED',
      'CANCELLED',
    ];
    for (const status of statuses) {
      expect(statusLabel(status)).not.toMatch(/[A-Z]{2,}_[A-Z]/);
    }
  });
});

describe('strongestEvidenceLevel', () => {
  it('prefers VERIFIED over REPORTED regardless of order', () => {
    expect(
      strongestEvidenceLevel([{ evidenceLevel: 'REPORTED' }, { evidenceLevel: 'VERIFIED' }]),
    ).toBe('VERIFIED');
  });

  it('returns null when nothing has been recorded', () => {
    expect(strongestEvidenceLevel([{ evidenceLevel: null }])).toBeNull();
    expect(strongestEvidenceLevel([])).toBeNull();
  });
});

describe('describeCompletion — REPORTED is never spoken as verified', () => {
  it('describes a manager-confirmed completion as reported, naming the reporter', () => {
    const result = describeCompletion({ status: 'COMPLETED', lifecycle: MANAGER_ATTESTATION });

    expect(result.verified).toBe(false);
    expect(result.headline).toBe('Completed — reported');
    expect(result.detail).toContain('a business manager');
    expect(result.detail).toContain('has not independently verified');
  });

  it('never emits the word "verified" as a claim for REPORTED evidence', () => {
    const result = describeCompletion({ status: 'COMPLETED', lifecycle: MANAGER_ATTESTATION });
    const text = `${result.headline} ${result.detail}`;

    // The only permitted use of the token is the explicit negation.
    expect(text).not.toMatch(/\bverified\b(?!\s|$)/i);
    expect(text.replace(/has not independently verified/i, '')).not.toMatch(/verified/i);
  });

  it('omits attribution when the receipt does not record who reported it', () => {
    const result = describeCompletion({
      status: 'COMPLETED',
      lifecycle: lifecycle([{ evidenceLevel: 'REPORTED' }]),
    });

    expect(result.verified).toBe(false);
    expect(result.detail).not.toContain('business manager');
    expect(result.detail).toContain('Completion was reported');
  });

  it('does not claim a manager when only the source state matches', () => {
    const result = describeCompletion({
      status: 'COMPLETED',
      lifecycle: lifecycle([{ evidenceLevel: 'REPORTED', sourceState: 'MANAGER_CONFIRMED' }]),
    });

    expect(result.detail).not.toContain('business manager');
  });

  it('speaks verification only when the receipt records VERIFIED', () => {
    const result = describeCompletion({
      status: 'COMPLETED',
      lifecycle: lifecycle([{ evidenceLevel: 'VERIFIED' }]),
    });

    expect(result.verified).toBe(true);
    expect(result.headline).toBe('Completed — verified');
  });

  it('says plainly when a completion carries no evidence at all', () => {
    const result = describeCompletion({ status: 'COMPLETED', lifecycle: [] });

    expect(result.verified).toBe(false);
    expect(result.headline).toContain('no evidence recorded');
    expect(result.detail).toContain('cannot confirm');
  });

  it('does not imply the outcome happened when Aureus exhausted the work', () => {
    const result = describeCompletion({ status: 'RESPONSIBLY_EXHAUSTED', lifecycle: [] });

    expect(result.verified).toBe(false);
    expect(result.detail).toContain('Nothing here claims the outcome happened');
  });

  it('describes cancellation without implying completion', () => {
    const result = describeCompletion({ status: 'CANCELLED', lifecycle: MANAGER_ATTESTATION });

    expect(result.headline).toBe('Cancelled');
    expect(result.verified).toBe(false);
  });
});

describe('describeEvidencePresence', () => {
  it('is truthful when nothing has been recorded', () => {
    expect(describeEvidencePresence([])).toBe('No evidence has been recorded yet.');
  });

  it('does not imply verification for reported progress', () => {
    expect(describeEvidencePresence([{ evidenceLevel: 'REPORTED' }])).toContain(
      'has not independently verified',
    );
  });
});

describe('promiseOf', () => {
  it('reads the Step 3 promise/criterion when present', () => {
    expect(promiseOf({ successCriteria: { promise: 'p', criterion: 'c' } })).toEqual({
      promise: 'p',
      criterion: 'c',
    });
  });

  it('degrades safely on malformed criteria rather than inventing text', () => {
    expect(promiseOf({ successCriteria: null })).toEqual({ promise: null, criterion: null });
    expect(promiseOf({ successCriteria: ['nope'] })).toEqual({ promise: null, criterion: null });
    expect(promiseOf({ successCriteria: { promise: 42 } })).toEqual({
      promise: null,
      criterion: null,
    });
  });
});
