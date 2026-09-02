import type { Prisma } from '@prisma/client';

export type KitchenBathReadyProjectStatus =
  | 'READY_FOR_EXPERT_REVIEW'
  | 'INCOMPLETE_SOURCE';

export type TransactionBarrierStatus =
  | 'CUSTOMER_STATED'
  | 'OPEN'
  | 'EXPERT_REQUIRED'
  | 'BUSINESS_REQUIRED'
  | 'NOT_ASSESSED';

export type KitchenBathBarrierKey =
  | 'DESIRE'
  | 'FIT'
  | 'PRICE'
  | 'FUNDING'
  | 'AVAILABILITY'
  | 'TIMING'
  | 'KNOWLEDGE_UNCERTAINTY'
  | 'TRUST'
  | 'DECISION_AUTHORITY'
  | 'ADMINISTRATIVE_FRICTION'
  | 'ALTERNATIVES';

export interface KitchenBathReadyProjectBarrier {
  key: KitchenBathBarrierKey;
  status: TransactionBarrierStatus;
  basis: string;
}

export interface KitchenBathReadyProject {
  contractVersion: 'or003-ready-project-v1';
  leadId: string;
  vertical: 'KITCHEN_BATH';
  readinessStatus: KitchenBathReadyProjectStatus;
  customerIntent: {
    projectType: string | null;
    rooms: string[];
    scope: string | null;
    priorities: string[];
    mustHaves: string | null;
    concerns: string | null;
  };
  constraints: {
    projectLocation: string | null;
    desiredTiming: string | null;
    decisionStatus: string | null;
    budgetRange: string | null;
    designNeeds: string | null;
    attachments: unknown[];
  };
  source: {
    basis: 'CONSENTED_WARD_HANDOFF';
    consentVersion: string;
    intakeHash: string | null;
    conversationTurns: number | null;
    submittedAt: Date | string;
    retentionExpiresAt: Date | string;
    modelInferencesIncluded: false;
  };
  transactionBarriers: KitchenBathReadyProjectBarrier[];
  expertValidationRequired: string[];
  boundaries: string[];
  missingRequiredSource: string[];
}

interface ReadyProjectLeadSource {
  id: string;
  projectLocation: string | null;
  desiredTiming: string | null;
  consentVersion: string;
  submittedAt: Date | string;
  retentionExpiresAt: Date | string;
  qualificationSignals: Prisma.JsonValue | null;
}

interface Signal {
  key: string;
  value: unknown;
}

function asSignalArray(value: Prisma.JsonValue | null): Signal[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || Array.isArray(entry) || typeof entry !== 'object') return [];
    const key = (entry as Record<string, unknown>).key;
    if (typeof key !== 'string') return [];
    return [{ key, value: (entry as Record<string, unknown>).value }];
  });
}

function signal(signals: Signal[], key: string): unknown {
  return signals.find((item) => item.key === key)?.value;
}

function stringSignal(signals: Signal[], key: string): string | null {
  const value = signal(signals, key);
  return typeof value === 'string' && value.trim() ? value : null;
}

function stringArraySignal(signals: Signal[], key: string): string[] {
  const value = signal(signals, key);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === 'string' && Boolean(item.trim()),
  );
}

function attachmentsSignal(signals: Signal[]): unknown[] {
  const value = signal(signals, 'project_attachments');
  return Array.isArray(value) ? value : [];
}

function conversationTurns(signals: Signal[]): number | null {
  const value = stringSignal(signals, 'conversation_turns');
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function buildKitchenBathReadyProject(
  lead: ReadyProjectLeadSource,
): KitchenBathReadyProject | null {
  const signals = asSignalArray(lead.qualificationSignals);
  if (stringSignal(signals, 'vertical') !== 'KITCHEN_BATH') return null;

  const projectType = stringSignal(signals, 'project_type');
  const rooms = stringArraySignal(signals, 'rooms');
  const scope = stringSignal(signals, 'scope');
  const intakeHash = stringSignal(signals, 'kitchen_bath_intake_hash');
  const priorities = stringArraySignal(signals, 'priorities');
  const mustHaves = stringSignal(signals, 'must_haves');
  const concerns = stringSignal(signals, 'concerns');
  const decisionStatus = stringSignal(signals, 'decision_status');
  const budgetRange = stringSignal(signals, 'budget_range');
  const designNeeds = stringSignal(signals, 'design_needs');

  const missingRequiredSource = [
    ...(!projectType ? ['projectType'] : []),
    ...(rooms.length === 0 ? ['rooms'] : []),
    ...(!scope ? ['scope'] : []),
    ...(!intakeHash ? ['intakeHash'] : []),
  ];

  const readinessStatus: KitchenBathReadyProjectStatus =
    missingRequiredSource.length === 0
      ? 'READY_FOR_EXPERT_REVIEW'
      : 'INCOMPLETE_SOURCE';

  const desireBasis = scope
    ? priorities.length
      ? 'Customer supplied project scope and explicit priorities.'
      : 'Customer supplied project scope.'
    : 'Required customer project scope is missing from the retained source.';

  const transactionBarriers: KitchenBathReadyProjectBarrier[] = [
    {
      key: 'DESIRE',
      status: scope ? 'CUSTOMER_STATED' : 'OPEN',
      basis: desireBasis,
    },
    {
      key: 'FIT',
      status: 'EXPERT_REQUIRED',
      basis:
        'Physical measurements, site conditions, feasibility, and trade dependencies require qualified expert review.',
    },
    {
      key: 'PRICE',
      status: 'BUSINESS_REQUIRED',
      basis:
        'This intake does not establish final project price, allowances, or a quote.',
    },
    {
      key: 'FUNDING',
      status: 'NOT_ASSESSED',
      basis:
        'Funding needs or financing eligibility were not assessed in OR-003.',
    },
    {
      key: 'AVAILABILITY',
      status: 'BUSINESS_REQUIRED',
      basis:
        'Actual consultation, labor, material, and project availability must come from the business or its connected source of truth.',
    },
    {
      key: 'TIMING',
      status: lead.desiredTiming ? 'CUSTOMER_STATED' : 'OPEN',
      basis: lead.desiredTiming
        ? 'Customer supplied desired timing; this is not a confirmed schedule.'
        : 'Customer did not supply desired timing.',
    },
    {
      key: 'KNOWLEDGE_UNCERTAINTY',
      status: 'EXPERT_REQUIRED',
      basis:
        'Material project assumptions remain subject to expert/site validation before proposal.',
    },
    {
      key: 'TRUST',
      status: 'NOT_ASSESSED',
      basis:
        'Aureus does not infer trust, sentiment, or purchase intent from conversation behavior.',
    },
    {
      key: 'DECISION_AUTHORITY',
      status: decisionStatus ? 'CUSTOMER_STATED' : 'OPEN',
      basis: decisionStatus
        ? 'Customer supplied their decision/ownership status.'
        : 'Decision authority was not supplied and is not inferred.',
    },
    {
      key: 'ADMINISTRATIVE_FRICTION',
      status: 'NOT_ASSESSED',
      basis:
        'Administrative requirements have not yet been established for this project.',
    },
    {
      key: 'ALTERNATIVES',
      status: 'NOT_ASSESSED',
      basis:
        'No substitute material, scope, contractor, or design alternative is represented as evaluated yet.',
    },
  ];

  return {
    contractVersion: 'or003-ready-project-v1',
    leadId: lead.id,
    vertical: 'KITCHEN_BATH',
    readinessStatus,
    customerIntent: {
      projectType,
      rooms,
      scope,
      priorities,
      mustHaves,
      concerns,
    },
    constraints: {
      projectLocation: lead.projectLocation,
      desiredTiming: lead.desiredTiming,
      decisionStatus,
      budgetRange,
      designNeeds,
      attachments: attachmentsSignal(signals),
    },
    source: {
      basis: 'CONSENTED_WARD_HANDOFF',
      consentVersion: lead.consentVersion,
      intakeHash,
      conversationTurns: conversationTurns(signals),
      submittedAt: lead.submittedAt,
      retentionExpiresAt: lead.retentionExpiresAt,
      modelInferencesIncluded: false,
    },
    transactionBarriers,
    expertValidationRequired: [
      'Confirm physical measurements and site conditions.',
      'Confirm scope feasibility and trade dependencies.',
      'Confirm final materials, specifications, and selections.',
      'Establish final pricing and allowances from authorized business sources.',
      'Confirm actual scheduling and availability.',
      'Determine code or permit requirements where applicable.',
      'Validate any assumption that materially affects a proposal before relying on it.',
    ],
    boundaries: [
      'Ready for expert review does not mean quote-ready, contract-ready, site-verified, finance-approved, permit-cleared, or construction-ready.',
      'No project price, appointment, permit requirement, approval, or business commitment is inferred from this packet.',
      'The raw Ward conversation remains attributable evidence; this packet is the distilled customer-supplied project state.',
    ],
    missingRequiredSource,
  };
}
