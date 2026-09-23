import type { ResponsibilityDto } from '../../../lib/api/responsibilities';
import { buildCarryState } from './responsibility-carry-state';

function staleStep5(): Record<string, unknown> {
  return {
    version: 'people-step5-obligation-v1',
    owner: 'MEMBER',
    requiredAction: 'Upload the requested proof of income.',
    dueAt: '2026-09-21T17:00:00.000Z',
    dueProvenance: 'VERIFIED',
    state: 'MISSED',
    lastAttemptAt: '2026-09-21T14:00:00.000Z',
    nextAttemptAt: null,
    reportedSatisfiedAt: null,
    verifiedSatisfiedAt: null,
    reviewRequired: true,
    reviewReason:
      'The current due time passed without evidence that the sourced obligation was satisfied.',
  };
}

function makeResponsibility(
  status: ResponsibilityDto['status'],
): ResponsibilityDto {
  return {
    id: `responsibility-terminal-${status.toLowerCase()}`,
    kind: 'PERSONAL_NEED_RESOLUTION',
    objective: 'Keep my housing stable',
    status,
    contextType: 'PERSONAL',
    authorityClass: 'GUIDANCE_ONLY',
    authorityPolicyVersion: 'personal-guidance-v1',
    privacyScope: 'PERSONAL_PRIVATE',
    privacyPolicyVersion: 'personal-private-v1',
    originConversationId: 'conversation-1',
    originOpportunityId: null,
    successCriteria: {
      type: 'PERSONAL_NEED_RESOLUTION',
      step5FollowThrough: staleStep5(),
    },
    dueAt: null,
    retentionExpiresAt: null,
    completedAt: status === 'COMPLETED' ? '2026-09-22T12:00:00.000Z' : null,
    createdAt: '2026-09-20T12:00:00.000Z',
    updatedAt: '2026-09-22T12:00:00.000Z',
    events: [],
  };
}

describe('UI-006 terminal Responsibility precedence', () => {
  it('keeps RESPONSIBLY_EXHAUSTED authoritative over a stale missed Step-5 follow-through', () => {
    const carry = buildCarryState(makeResponsibility('RESPONSIBLY_EXHAUSTED'));

    expect(carry).not.toBeNull();
    expect(carry?.status).toBe('No responsible path remains right now.');
    expect(carry?.carrying).toBe('Aureus could not responsibly continue this further.');
    expect(carry?.recovery).toEqual({
      changed: 'I could not find a responsible way to continue this path.',
      remainsTrue: 'I have not marked the goal as achieved.',
      alreadyDone: null,
      next: 'There is no responsible next route recorded right now.',
      holder: null,
      checkpointAt: null,
    });
    expect(carry?.recovery?.changed).not.toContain('due time passed');
  });

  it('does not resurrect Step-5 recovery after COMPLETED', () => {
    const carry = buildCarryState(makeResponsibility('COMPLETED'));

    expect(carry).not.toBeNull();
    expect(carry?.status).toBe('This bounded responsibility is complete.');
    expect(carry?.carrying).toBe('Completed — nothing further to carry.');
    expect(carry?.recovery).toBeNull();
    expect(carry?.needsYou).toBeNull();
    expect(carry?.nextAction).toBeNull();
  });

  it('does not resurrect Step-5 recovery after CANCELLED', () => {
    const carry = buildCarryState(makeResponsibility('CANCELLED'));

    expect(carry).not.toBeNull();
    expect(carry?.status).toBe('This responsibility was cancelled.');
    expect(carry?.carrying).toBe('Cancelled — no longer active.');
    expect(carry?.recovery).toBeNull();
    expect(carry?.needsYou).toBeNull();
    expect(carry?.nextAction).toBeNull();
  });
});
