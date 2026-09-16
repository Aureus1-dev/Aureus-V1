import {
  OrganizationMemberRole,
  ResponsibilityEvidenceLevel,
  ResponsibilityEventType,
  ResponsibilityStatus,
  WardLeadStatus,
} from '@prisma/client';
import {
  availableRevenueActions,
  buildRevenueCompletionProjection,
  parseRevenueMilestones,
  REVENUE_SOURCE_SYSTEM,
  revenueRecordType,
  revenueSourceRecordId,
  revenueSourceState,
  type RevenueEvidenceEvent,
} from './business-revenue-completion';
import {
  RevenueCompletionStage,
  RevenueDecision,
} from './dto/record-revenue-milestone.dto';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';

function revenueEvent(
  id: string,
  stage: RevenueCompletionStage,
  seconds: number,
  options: {
    decision?: RevenueDecision;
    evidenceLevel?: ResponsibilityEvidenceLevel;
    sourceSystem?: string;
    requestKey?: string;
  } = {},
): RevenueEvidenceEvent {
  const requestKey = options.requestKey ?? `22222222-2222-4222-8222-${seconds.toString().padStart(12, '0')}`;
  return {
    id,
    type: ResponsibilityEventType.ACTION_EVIDENCED,
    sourceSystem: options.sourceSystem ?? REVENUE_SOURCE_SYSTEM,
    sourceRecordType: revenueRecordType(stage),
    sourceRecordId: revenueSourceRecordId(ACTOR_ID, requestKey),
    sourceState: revenueSourceState(`ref-${id}`, options.decision),
    evidenceLevel: options.evidenceLevel ?? ResponsibilityEvidenceLevel.REPORTED,
    occurredAt: new Date(`2026-09-16T00:00:${seconds.toString().padStart(2, '0')}.000Z`),
  };
}

function projection(input: {
  events?: RevenueEvidenceEvent[];
  role?: OrganizationMemberRole | null;
  leadStatus?: WardLeadStatus;
  ready?: boolean;
}) {
  return buildRevenueCompletionProjection({
    responsibilityId: 'resp-1',
    responsibilityStatus: ResponsibilityStatus.ACTIVE,
    events: input.events ?? [],
    role: input.role ?? OrganizationMemberRole.MANAGER,
    leadStatus: input.leadStatus ?? WardLeadStatus.CONTACTED,
    readyProjectReady: input.ready ?? true,
  });
}

describe('OR-004 revenue completion projection', () => {
  it('admits only the exact Step 4 reported revenue evidence contract', () => {
    const good = revenueEvent('good', RevenueCompletionStage.PROPOSAL_RECORDED, 1);
    const verified = revenueEvent('verified', RevenueCompletionStage.CONTRACT_RECORDED, 2, {
      evidenceLevel: ResponsibilityEvidenceLevel.VERIFIED,
    });
    const otherSystem = revenueEvent('other', RevenueCompletionStage.FOLLOW_UP_RECORDED, 3, {
      sourceSystem: 'SOME_OTHER_SYSTEM',
    });
    const wrongType: RevenueEvidenceEvent = {
      ...revenueEvent('wrong-type', RevenueCompletionStage.FOLLOW_UP_RECORDED, 4),
      type: ResponsibilityEventType.STATE_CHANGED,
    };

    expect(parseRevenueMilestones([good, verified, otherSystem, wrongType])).toEqual([
      expect.objectContaining({
        eventId: 'good',
        stage: RevenueCompletionStage.PROPOSAL_RECORDED,
        evidenceLevel: 'REPORTED',
        reportedByUserId: ACTOR_ID,
      }),
    ]);
  });

  it('fails closed for operator authority at consequential boundaries', () => {
    const events = [
      revenueEvent('validated', RevenueCompletionStage.READY_PROJECT_VALIDATED, 1),
      revenueEvent('proposal', RevenueCompletionStage.PROPOSAL_RECORDED, 2),
    ];

    expect(
      availableRevenueActions({
        role: OrganizationMemberRole.OPERATOR,
        leadStatus: WardLeadStatus.CONTACTED,
        readyProjectReady: true,
        milestones: parseRevenueMilestones(events),
      }),
    ).toEqual([RevenueCompletionStage.FOLLOW_UP_RECORDED]);

    expect(
      availableRevenueActions({
        role: OrganizationMemberRole.MANAGER,
        leadStatus: WardLeadStatus.CONTACTED,
        readyProjectReady: true,
        milestones: parseRevenueMilestones(events),
      }),
    ).toEqual([
      RevenueCompletionStage.FOLLOW_UP_RECORDED,
      RevenueCompletionStage.DECISION_RECORDED,
    ]);
  });

  it('requires a revised proposal after revision requested before another decision', () => {
    const revisedNeeded = [
      revenueEvent('validated', RevenueCompletionStage.READY_PROJECT_VALIDATED, 1),
      revenueEvent('proposal-1', RevenueCompletionStage.PROPOSAL_RECORDED, 2),
      revenueEvent('decision-1', RevenueCompletionStage.DECISION_RECORDED, 3, {
        decision: RevenueDecision.REVISION_REQUESTED,
      }),
    ];
    expect(projection({ events: revisedNeeded }).availableActions).toEqual([
      RevenueCompletionStage.PROPOSAL_RECORDED,
    ]);

    const revisedProposal = [
      ...revisedNeeded,
      revenueEvent('proposal-2', RevenueCompletionStage.PROPOSAL_RECORDED, 4),
    ];
    expect(projection({ events: revisedProposal }).availableActions).toEqual([
      RevenueCompletionStage.FOLLOW_UP_RECORDED,
      RevenueCompletionStage.DECISION_RECORDED,
    ]);
  });

  it('uses canonical milestone sequence when revision and revised proposal share a timestamp', () => {
    const sameSecond = 3;
    const events = [
      revenueEvent('validated', RevenueCompletionStage.READY_PROJECT_VALIDATED, 1),
      revenueEvent('proposal-1', RevenueCompletionStage.PROPOSAL_RECORDED, 2),
      revenueEvent('decision-1', RevenueCompletionStage.DECISION_RECORDED, sameSecond, {
        decision: RevenueDecision.REVISION_REQUESTED,
        requestKey: '22222222-2222-4222-8222-000000000301',
      }),
      revenueEvent('proposal-2', RevenueCompletionStage.PROPOSAL_RECORDED, sameSecond, {
        requestKey: '22222222-2222-4222-8222-000000000302',
      }),
    ];

    expect(projection({ events }).availableActions).toEqual([
      RevenueCompletionStage.FOLLOW_UP_RECORDED,
      RevenueCompletionStage.DECISION_RECORDED,
    ]);
  });

  it('unlocks contract after accepted decision, then optional deposit and handoff', () => {
    const accepted = [
      revenueEvent('validated', RevenueCompletionStage.READY_PROJECT_VALIDATED, 1),
      revenueEvent('proposal', RevenueCompletionStage.PROPOSAL_RECORDED, 2),
      revenueEvent('decision', RevenueCompletionStage.DECISION_RECORDED, 3, {
        decision: RevenueDecision.ACCEPTED,
      }),
    ];
    expect(projection({ events: accepted }).availableActions).toEqual([
      RevenueCompletionStage.CONTRACT_RECORDED,
    ]);

    const contracted = [
      ...accepted,
      revenueEvent('contract', RevenueCompletionStage.CONTRACT_RECORDED, 4),
    ];
    expect(projection({ events: contracted }).availableActions).toEqual([
      RevenueCompletionStage.DEPOSIT_RECORDED,
      RevenueCompletionStage.OPERATIONS_HANDOFF_RECORDED,
    ]);
  });

  it('exposes no new revenue mutation on terminal lead state', () => {
    const events = [
      revenueEvent('validated', RevenueCompletionStage.READY_PROJECT_VALIDATED, 1),
      revenueEvent('proposal', RevenueCompletionStage.PROPOSAL_RECORDED, 2),
    ];

    expect(projection({ events, leadStatus: WardLeadStatus.LOST }).availableActions).toEqual([]);
    expect(projection({ events, leadStatus: WardLeadStatus.CLOSED }).availableActions).toEqual([]);
  });

  it('keeps Earn, Keep, and Compound unknown instead of fabricating economics', () => {
    const result = projection({
      events: [
        revenueEvent('validated', RevenueCompletionStage.READY_PROJECT_VALIDATED, 1),
        revenueEvent('proposal', RevenueCompletionStage.PROPOSAL_RECORDED, 2),
      ],
    });

    expect(result.economicStewardship.earn.status).toBe('UNKNOWN');
    expect(result.economicStewardship.convert.status).toBe('REPORTED');
    expect(result.economicStewardship.keep.status).toBe('UNKNOWN');
    expect(result.economicStewardship.compound.status).toBe('UNKNOWN');
    expect(result.evidenceNotice).toMatch(/not independently verified/i);
  });

  it('does not offer validation until the OR-003 Ready Project is actually ready', () => {
    expect(projection({ events: [], ready: false }).availableActions).toEqual([]);
    expect(projection({ events: [], ready: true }).availableActions).toEqual([
      RevenueCompletionStage.READY_PROJECT_VALIDATED,
    ]);
  });
});
