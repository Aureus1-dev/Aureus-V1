import { createHash } from 'node:crypto';
import {
  OrganizationMemberRole,
  ResponsibilityEvidenceLevel,
  ResponsibilityEventType,
  ResponsibilityStatus,
  WardLeadStatus,
} from '@prisma/client';
import {
  RevenueCompletionStage,
  RevenueDecision,
} from './dto/record-revenue-milestone.dto';

export const REVENUE_SOURCE_SYSTEM = 'AUREUS_BUSINESS_REVENUE';
export const REVENUE_RECORD_PREFIX = 'RevenueMilestone.';
export const REVENUE_RESPONSIBILITY_PREFIX = 'or004-revenue-completion';

const WORK_ROLES = new Set<OrganizationMemberRole>([
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
  OrganizationMemberRole.OPERATOR,
]);

const MANAGE_ROLES = new Set<OrganizationMemberRole>([
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
]);

const TERMINAL_LEAD = new Set<WardLeadStatus>([WardLeadStatus.CLOSED, WardLeadStatus.LOST]);

export interface RevenueEvidenceEvent {
  id: string;
  type: ResponsibilityEventType;
  sourceSystem: string | null;
  sourceRecordType: string | null;
  sourceRecordId: string | null;
  sourceState: string | null;
  evidenceLevel: ResponsibilityEvidenceLevel | null;
  occurredAt: Date;
}

export interface RevenueMilestoneProjection {
  eventId: string;
  stage: RevenueCompletionStage;
  evidenceReference: string;
  decision: RevenueDecision | null;
  evidenceLevel: 'REPORTED';
  reportedByUserId: string | null;
  requestKey: string | null;
  occurredAt: string;
}

export interface RevenueCompletionProjection {
  contractVersion: 'or004-revenue-completion-v1';
  responsibilityId: string | null;
  responsibilityStatus: ResponsibilityStatus | null;
  currentStage: RevenueCompletionStage | null;
  leadStatus: WardLeadStatus;
  milestones: RevenueMilestoneProjection[];
  latestDecision: RevenueDecision | null;
  availableActions: RevenueCompletionStage[];
  nextRequiredAction: string;
  evidenceNotice: string;
  economicStewardship: {
    earn: { status: 'UNKNOWN'; basis: string };
    convert: {
      status: 'REPORTED';
      stage: RevenueCompletionStage | null;
      leadStatus: WardLeadStatus;
      basis: string;
    };
    keep: { status: 'UNKNOWN'; basis: string };
    compound: { status: 'UNKNOWN'; basis: string };
  };
}

export function revenueResponsibilityRequestKey(leadId: string): string {
  const raw = createHash('sha256')
    .update(`${REVENUE_RESPONSIBILITY_PREFIX}:${leadId}`)
    .digest('hex')
    .slice(0, 32)
    .split('');
  // Produce a stable RFC-4122-shaped UUID so the canonical Step 3 request-key
  // contract can provide race-safe get-or-create semantics for this work.
  raw[12] = '4';
  raw[16] = ['8', '9', 'a', 'b'][Number.parseInt(raw[16], 16) % 4];
  const hex = raw.join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function revenueRecordType(stage: RevenueCompletionStage): string {
  return `${REVENUE_RECORD_PREFIX}${stage}`;
}

export function revenueSourceRecordId(actorUserId: string, requestKey: string): string {
  return `${actorUserId}:${requestKey}`;
}

export function revenueSourceState(
  evidenceReference: string,
  decision?: RevenueDecision,
): string {
  return decision ? `${decision}|${evidenceReference}` : evidenceReference;
}

export function parseRevenueMilestones(
  events: RevenueEvidenceEvent[],
): RevenueMilestoneProjection[] {
  return events.flatMap((event) => {
    if (
      event.type !== ResponsibilityEventType.ACTION_EVIDENCED ||
      event.sourceSystem !== REVENUE_SOURCE_SYSTEM ||
      !event.sourceRecordType?.startsWith(REVENUE_RECORD_PREFIX) ||
      event.evidenceLevel !== ResponsibilityEvidenceLevel.REPORTED ||
      !event.sourceRecordId ||
      !event.sourceState
    ) {
      return [];
    }

    const rawStage = event.sourceRecordType.slice(REVENUE_RECORD_PREFIX.length);
    if (!Object.values(RevenueCompletionStage).includes(rawStage as RevenueCompletionStage)) {
      return [];
    }
    const stage = rawStage as RevenueCompletionStage;
    const [actorOrRequest, requestMaybe] = event.sourceRecordId.split(':');
    const reportedByUserId = requestMaybe ? actorOrRequest : null;
    const requestKey = requestMaybe ?? actorOrRequest ?? null;

    let decision: RevenueDecision | null = null;
    let evidenceReference = event.sourceState;
    if (stage === RevenueCompletionStage.DECISION_RECORDED) {
      const separator = event.sourceState.indexOf('|');
      if (separator < 1) return [];
      const rawDecision = event.sourceState.slice(0, separator);
      if (!Object.values(RevenueDecision).includes(rawDecision as RevenueDecision)) return [];
      decision = rawDecision as RevenueDecision;
      evidenceReference = event.sourceState.slice(separator + 1);
      if (!evidenceReference) return [];
    }

    return [
      {
        eventId: event.id,
        stage,
        evidenceReference,
        decision,
        evidenceLevel: 'REPORTED' as const,
        reportedByUserId,
        requestKey,
        occurredAt: event.occurredAt.toISOString(),
      },
    ];
  });
}

export function latestRevenueDecision(
  milestones: RevenueMilestoneProjection[],
): RevenueDecision | null {
  return [...milestones]
    .reverse()
    .find((milestone) => milestone.stage === RevenueCompletionStage.DECISION_RECORDED)
    ?.decision ?? null;
}

export function hasRevenueStage(
  milestones: RevenueMilestoneProjection[],
  stage: RevenueCompletionStage,
): boolean {
  return milestones.some((milestone) => milestone.stage === stage);
}

export function latestRevenueStage(
  milestones: RevenueMilestoneProjection[],
): RevenueCompletionStage | null {
  return milestones.at(-1)?.stage ?? null;
}

export function availableRevenueActions(input: {
  role: OrganizationMemberRole | null;
  leadStatus: WardLeadStatus;
  readyProjectReady: boolean;
  milestones: RevenueMilestoneProjection[];
}): RevenueCompletionStage[] {
  const { role, leadStatus, readyProjectReady, milestones } = input;
  if (!role || TERMINAL_LEAD.has(leadStatus)) return [];
  if (!WORK_ROLES.has(role)) return [];

  const hasValidation = hasRevenueStage(
    milestones,
    RevenueCompletionStage.READY_PROJECT_VALIDATED,
  );
  const proposals = milestones.filter(
    (milestone) => milestone.stage === RevenueCompletionStage.PROPOSAL_RECORDED,
  );
  const decisions = milestones.filter(
    (milestone) => milestone.stage === RevenueCompletionStage.DECISION_RECORDED,
  );
  const hasContract = hasRevenueStage(milestones, RevenueCompletionStage.CONTRACT_RECORDED);
  const hasDeposit = hasRevenueStage(milestones, RevenueCompletionStage.DEPOSIT_RECORDED);
  const hasHandoff = hasRevenueStage(
    milestones,
    RevenueCompletionStage.OPERATIONS_HANDOFF_RECORDED,
  );

  if (!hasValidation) {
    return readyProjectReady ? [RevenueCompletionStage.READY_PROJECT_VALIDATED] : [];
  }

  const latestProposal = proposals.at(-1) ?? null;
  const latestDecisionMilestone = decisions.at(-1) ?? null;
  const decisionAfterLatestProposal = Boolean(
    latestProposal &&
      latestDecisionMilestone &&
      Date.parse(latestDecisionMilestone.occurredAt) >= Date.parse(latestProposal.occurredAt),
  );
  const latestDecision = latestDecisionMilestone?.decision ?? null;
  const canManage = MANAGE_ROLES.has(role);

  if (!latestProposal) {
    return leadStatus === WardLeadStatus.CONTACTED
      ? [RevenueCompletionStage.PROPOSAL_RECORDED]
      : [];
  }

  if (latestDecision === RevenueDecision.REVISION_REQUESTED && decisionAfterLatestProposal) {
    return [RevenueCompletionStage.PROPOSAL_RECORDED];
  }

  if (!decisionAfterLatestProposal) {
    return [
      RevenueCompletionStage.FOLLOW_UP_RECORDED,
      ...(canManage ? [RevenueCompletionStage.DECISION_RECORDED] : []),
    ];
  }

  if (latestDecision !== RevenueDecision.ACCEPTED) return [];
  if (!hasContract) {
    return canManage ? [RevenueCompletionStage.CONTRACT_RECORDED] : [];
  }
  if (!canManage || hasHandoff) return [];

  return [
    ...(!hasDeposit ? [RevenueCompletionStage.DEPOSIT_RECORDED] : []),
    RevenueCompletionStage.OPERATIONS_HANDOFF_RECORDED,
  ];
}

export function buildRevenueCompletionProjection(input: {
  responsibilityId: string | null;
  responsibilityStatus: ResponsibilityStatus | null;
  events: RevenueEvidenceEvent[];
  role: OrganizationMemberRole | null;
  leadStatus: WardLeadStatus;
  readyProjectReady: boolean;
}): RevenueCompletionProjection {
  const milestones = parseRevenueMilestones(input.events);
  const currentStage = latestRevenueStage(milestones);
  const latestDecision = latestRevenueDecision(milestones);
  const availableActions = availableRevenueActions({
    role: input.role,
    leadStatus: input.leadStatus,
    readyProjectReady: input.readyProjectReady,
    milestones,
  });

  let nextRequiredAction = 'Complete the Ready Project source before revenue completion can begin.';
  if (input.leadStatus === WardLeadStatus.LOST) {
    nextRequiredAction = 'No next sales action. This handoff is recorded as lost.';
  } else if (input.leadStatus === WardLeadStatus.CLOSED) {
    nextRequiredAction = 'The sale is recorded as handed to operations. Project completion is separate.';
  } else if (availableActions.includes(RevenueCompletionStage.READY_PROJECT_VALIDATED)) {
    nextRequiredAction = 'Have an expert validate the Ready Project, then record that report.';
  } else if (availableActions.includes(RevenueCompletionStage.PROPOSAL_RECORDED)) {
    nextRequiredAction =
      latestDecision === RevenueDecision.REVISION_REQUESTED
        ? 'Record the revised proposal after the business issues it.'
        : 'Move the handoff to contacted, then record the business proposal.';
  } else if (availableActions.includes(RevenueCompletionStage.DECISION_RECORDED)) {
    nextRequiredAction = 'Follow up as needed, then record the customer’s reported decision.';
  } else if (availableActions.includes(RevenueCompletionStage.CONTRACT_RECORDED)) {
    nextRequiredAction = 'Record the contract boundary after authorized humans complete it.';
  } else if (availableActions.includes(RevenueCompletionStage.OPERATIONS_HANDOFF_RECORDED)) {
    nextRequiredAction = 'Record any applicable deposit, then hand the accepted sale to operations.';
  } else if (currentStage) {
    nextRequiredAction = 'A manager must record the next consequential sales boundary.';
  }

  return {
    contractVersion: 'or004-revenue-completion-v1',
    responsibilityId: input.responsibilityId,
    responsibilityStatus: input.responsibilityStatus,
    currentStage,
    leadStatus: input.leadStatus,
    milestones,
    latestDecision,
    availableActions,
    nextRequiredAction,
    evidenceNotice:
      'Revenue milestones here are business-reported evidence. Aureus has not independently verified proposals, decisions, contracts, deposits, or operations handoffs.',
    economicStewardship: {
      earn: {
        status: 'UNKNOWN',
        basis: 'OR-004 records proposal existence but does not ingest proposal value or revenue amount.',
      },
      convert: {
        status: 'REPORTED',
        stage: currentStage,
        leadStatus: input.leadStatus,
        basis: 'Conversion progress is derived from tenant-scoped reported milestones and the canonical WardLead status.',
      },
      keep: {
        status: 'UNKNOWN',
        basis: 'A reported deposit is not evidence of margin, retained earnings, or profitability.',
      },
      compound: {
        status: 'UNKNOWN',
        basis: 'OR-004 has no repeat, referral, retention, or compounding-value source.',
      },
    },
  };
}
