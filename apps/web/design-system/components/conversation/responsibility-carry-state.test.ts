import type { PeopleResponsibilityDto, PeopleResponsibilityEventDto } from '../../../lib/api/people-help';
import { buildCarryState } from './responsibility-carry-state';

function makeEvent(overrides: Partial<PeopleResponsibilityEventDto> = {}): PeopleResponsibilityEventDto {
  return {
    id: 'event-1',
    type: 'STATE_CHANGED',
    actorClass: 'SYSTEM',
    actorUserId: null,
    fromStatus: 'ACTIVE',
    toStatus: 'ACTIVE',
    sourceSystem: null,
    sourceRecordType: null,
    sourceRecordId: null,
    sourceState: null,
    evidenceLevel: null,
    occurredAt: '2026-09-01T20:00:00.000Z',
    ...overrides,
  };
}

function makeResponsibility(overrides: Partial<PeopleResponsibilityDto> = {}): PeopleResponsibilityDto {
  return {
    id: 'responsibility-1',
    kind: 'OPPORTUNITY_APPLICATION_GUIDANCE',
    objective: 'Help me work through the verified application for Career Training Grant',
    status: 'ACTIVE',
    contextType: 'PERSONAL',
    authorityClass: 'GUIDANCE_ONLY',
    authorityPolicyVersion: 'responsibility-guidance-v1',
    privacyScope: 'PERSONAL_PRIVATE',
    privacyPolicyVersion: 'personal-private-v1',
    originConversationId: 'conversation-1',
    originOpportunityId: 'opportunity-1',
    successCriteria: { type: 'APPLICATION_GUIDANCE_MEMBER_OUTCOME_RECORDED' },
    dueAt: null,
    retentionExpiresAt: null,
    completedAt: null,
    createdAt: '2026-09-01T20:00:00.000Z',
    updatedAt: '2026-09-01T20:00:00.000Z',
    events: [],
    ...overrides,
  };
}

describe('buildCarryState', () => {
  it('returns null when there is no durable Responsibility, rather than fabricating one', () => {
    expect(buildCarryState(null)).toBeNull();
  });

  it('projects the real objective as "Working on" and a plain-language status for ACTIVE work with a live guide session', () => {
    // hasActiveGuideSession=true: Aureus is genuinely guiding right now.
    const state = buildCarryState(makeResponsibility(), true);
    expect(state).not.toBeNull();
    expect(state!.workingOn).toBe('Help me work through the verified application for Career Training Grant');
    expect(state!.status).toBe('We are working on this together now.');
    expect(state!.carrying).toMatch(/guiding you through the verified application/i);
    expect(state!.nextAction).toEqual({ description: 'Continue the guided application.', owner: 'AUREUS' });
    expect(state!.needsYou).toBeNull();
  });

  it('does not claim Aureus is guiding, and identifies the real member action, for ACTIVE work with no live guide session', () => {
    // The backend's ACTIVE status alone never proves a session is open —
    // OR-002 accepts the Responsibility before the guide session necessarily
    // exists, and a member can leave without an explicit pause. Omitting the
    // second argument (hasActiveGuideSession) models exactly that state.
    const state = buildCarryState(makeResponsibility({ status: 'ACTIVE' }));
    expect(state).not.toBeNull();
    expect(state!.carrying).not.toMatch(/guiding you/i);
    expect(state!.carrying).toMatch(/ready to continue/i);
    expect(state!.needsYou).toMatch(/resume the guided application/i);
    expect(state!.nextAction).toEqual({
      description: state!.needsYou,
      owner: 'MEMBER',
    });
  });

  it('only shows "Needs you" when the Responsibility genuinely requires the member (WAITING_ON_USER, or ACTIVE guidance with no live session)', () => {
    const activeWithLiveSession = buildCarryState(makeResponsibility({ status: 'ACTIVE' }), true);
    expect(activeWithLiveSession!.needsYou).toBeNull();

    const waitingThirdParty = buildCarryState(makeResponsibility({ status: 'WAITING_ON_THIRD_PARTY' }));
    expect(waitingThirdParty!.needsYou).toBeNull();
    expect(waitingThirdParty!.nextAction).toEqual({
      description: 'Waiting on an outside party to respond.',
      owner: 'THIRD_PARTY',
    });

    const waitingOnUser = buildCarryState(makeResponsibility({ status: 'WAITING_ON_USER' }));
    expect(waitingOnUser!.needsYou).toMatch(/return to finish the guided application/i);
    expect(waitingOnUser!.nextAction).toEqual({
      description: waitingOnUser!.needsYou,
      owner: 'MEMBER',
    });
  });

  it('does not describe completed work as currently in progress, and clears "Needs you"/"Next action"', () => {
    const completed = buildCarryState(
      makeResponsibility({
        status: 'COMPLETED',
        completedAt: '2026-09-01T21:00:00.000Z',
        events: [
          makeEvent({
            id: 'event-completed',
            type: 'COMPLETED',
            actorClass: 'SYSTEM',
            fromStatus: 'ACTIVE',
            toStatus: 'COMPLETED',
            sourceSystem: 'OPPORTUNITY_ENGINE',
            sourceRecordType: 'SavedOpportunity',
            sourceRecordId: 'saved-1',
            sourceState: 'APPLIED',
            evidenceLevel: 'REPORTED',
            occurredAt: '2026-09-01T21:00:00.000Z',
          }),
        ],
      }),
    );

    expect(completed!.carrying).toMatch(/completed/i);
    expect(completed!.carrying).not.toMatch(/in progress|guiding you/i);
    expect(completed!.needsYou).toBeNull();
    expect(completed!.nextAction).toBeNull();
  });

  it('derives "Done means" from the real successCriteria contract, never generic filler when the type is known', () => {
    const applicationGuidance = buildCarryState(
      makeResponsibility({ successCriteria: { type: 'APPLICATION_GUIDANCE_MEMBER_OUTCOME_RECORDED' } }),
    );
    expect(applicationGuidance!.doneMeans).toMatch(/tell aureus you applied or decided not to continue/i);

    const opportunityDecision = buildCarryState(
      makeResponsibility({
        kind: 'OPPORTUNITY_DECISION',
        successCriteria: { type: 'OPPORTUNITY_DECISION_RECORDED' },
      }),
    );
    expect(opportunityDecision!.doneMeans).toMatch(/recorded a decision about this opportunity/i);

    const unknown = buildCarryState(makeResponsibility({ successCriteria: { type: 'SOME_FUTURE_KIND' } }));
    expect(unknown!.doneMeans).toMatch(/verified outcome/i);
  });

  it('extracts evidence only from events that actually carry proof, never from a bare status change', () => {
    const state = buildCarryState(
      makeResponsibility({
        status: 'COMPLETED',
        events: [
          makeEvent({ id: 'e1', type: 'ACCEPTED', occurredAt: '2026-09-01T20:00:00.000Z' }),
          makeEvent({
            id: 'e2',
            type: 'STATE_CHANGED',
            fromStatus: 'ACTIVE',
            toStatus: 'WAITING_ON_USER',
            occurredAt: '2026-09-01T20:30:00.000Z',
          }),
          makeEvent({
            id: 'e3',
            type: 'COMPLETED',
            sourceSystem: 'OPPORTUNITY_ENGINE',
            sourceRecordType: 'SavedOpportunity',
            sourceRecordId: 'saved-1',
            sourceState: 'APPLIED',
            evidenceLevel: 'REPORTED',
            occurredAt: '2026-09-01T21:00:00.000Z',
          }),
        ],
      }),
    );

    expect(state!.evidence).toHaveLength(1);
    expect(state!.evidence[0].description).toMatch(/submitted\/applied/i);
    expect(state!.evidence[0].description).toMatch(/reported/i);
    expect(state!.evidence[0].level).toBe('REPORTED');
    expect(state!.evidence[0].occurredAt).toBe('2026-09-01T21:00:00.000Z');
  });

  it('classifies each status into a visual-only tone, distinct from the displayed text, never itself displayed', () => {
    expect(buildCarryState(makeResponsibility({ status: 'ACTIVE' }), true)!.tone).toBe('active');
    expect(buildCarryState(makeResponsibility({ status: 'WAITING_ON_AUREUS' }))!.tone).toBe('active');
    expect(buildCarryState(makeResponsibility({ status: 'WAITING_ON_USER' }))!.tone).toBe('attention');
    expect(buildCarryState(makeResponsibility({ status: 'WAITING_ON_THIRD_PARTY' }))!.tone).toBe('neutral');
    expect(buildCarryState(makeResponsibility({ status: 'BLOCKED' }))!.tone).toBe('blocked');
    expect(buildCarryState(makeResponsibility({ status: 'RESPONSIBLY_EXHAUSTED' }))!.tone).toBe('blocked');
    expect(buildCarryState(makeResponsibility({ status: 'COMPLETED' }))!.tone).toBe('complete');
    expect(buildCarryState(makeResponsibility({ status: 'CANCELLED' }))!.tone).toBe('neutral');
  });

  it('carries the real authority/privacy boundary disclosure for guidance work, and none for kinds that have no such disclosure', () => {
    const guidance = buildCarryState(makeResponsibility({ kind: 'OPPORTUNITY_APPLICATION_GUIDANCE' }));
    expect(guidance!.authorityNote).toMatch(/you remain in control of what you enter, attest to, and submit/i);
    expect(guidance!.authorityNote).toMatch(/private to your aureus account/i);

    const decision = buildCarryState(makeResponsibility({ kind: 'OPPORTUNITY_DECISION' }));
    expect(decision!.authorityNote).toBeNull();
  });

  it('computes "Last activity" from the most recent event, falling back to updatedAt when there are no events', () => {
    const withEvents = buildCarryState(
      makeResponsibility({
        updatedAt: '2026-09-01T20:00:00.000Z',
        events: [
          makeEvent({ id: 'e1', occurredAt: '2026-09-01T20:05:00.000Z' }),
          makeEvent({ id: 'e2', occurredAt: '2026-09-01T20:45:00.000Z' }),
        ],
      }),
    );
    expect(withEvents!.lastActivityAt).toBe('2026-09-01T20:45:00.000Z');

    const withoutEvents = buildCarryState(makeResponsibility({ updatedAt: '2026-09-01T20:00:00.000Z', events: [] }));
    expect(withoutEvents!.lastActivityAt).toBe('2026-09-01T20:00:00.000Z');
  });
});
