import type { Prisma } from '@prisma/client';

const PROJECT_TYPES = new Set([
  'KITCHEN',
  'BATHROOM',
  'KITCHEN_AND_BATH',
  'OTHER_REMODELING',
]);

const PRIORITIES = new Set([
  'LOOK_AND_FEEL',
  'FUNCTION_AND_LAYOUT',
  'DURABILITY',
  'BUDGET_CONTROL',
  'TIMING',
  'ACCESSIBILITY',
  'LOW_MAINTENANCE',
  'RESALE_VALUE',
  'ENERGY_EFFICIENCY',
  'OTHER',
]);

const DECISION_STATUSES = new Set([
  'OWNER_DECISION_MAKER',
  'OWNER_WITH_OTHER_DECISION_MAKERS',
  'AUTHORIZED_REPRESENTATIVE',
  'EXPLORING',
]);

const BUDGET_RANGES = new Set([
  'UNDER_25000',
  'FROM_25000_TO_50000',
  'FROM_50000_TO_100000',
  'FROM_100000_TO_200000',
  'OVER_200000',
  'UNSURE',
]);

const SHA256_RE = /^[a-f0-9]{64}$/;

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
    attachments: Array<{
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    }>;
  };
  source: {
    basis: 'CONSENTED_WARD_HANDOFF';
    consentVersion: string;
    intakeIntegrity: 'SYSTEM_HASH_PRESENT' | 'MISSING';
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

export type KitchenBathPublicReadyProject = Omit<
  KitchenBathReadyProject,
  'leadId' | 'source' | 'transactionBarriers'
> & {
  source: Pick<
    KitchenBathReadyProject['source'],
    'basis' | 'modelInferencesIncluded'
  >;
};

export function toPublicKitchenBathReadyProject(
  project: KitchenBathReadyProject | null,
): KitchenBathPublicReadyProject | null {
  if (!project) return null;
  const {
    leadId: _leadId,
    transactionBarriers: _transactionBarriers,
    source,
    ...shared
  } = project;

  return {
    ...shared,
    source: {
      basis: source.basis,
      modelInferencesIncluded: false,
    },
  };
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

function allowedStringSignal(
  signals: Signal[],
  key: string,
  allowed: Set<string>,
): string | null {
  const value = stringSignal(signals, key);
  return value && allowed.has(value) ? value : null;
}

function allowedStringArraySignal(
  signals: Signal[],
  key: string,
  allowed: Set<string>,
): string[] {
  return stringArraySignal(signals, key).filter((value) => allowed.has(value));
}

function attachmentsSignal(
  signals: Signal[],
): Array<{ fileName: string; mimeType: string; sizeBytes: number }> {
  const value = signal(signals, 'project_attachments');
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    if (
      typeof record.fileName !== 'string' ||
      typeof record.mimeType !== 'string' ||
      typeof record.sizeBytes !== 'number' ||
      !Number.isInteger(record.sizeBytes) ||
      record.sizeBytes < 1 ||
      record.sizeBytes > 20_000_000 ||
      !record.fileName.trim() ||
      !record.mimeType.trim()
    ) {
      return [];
    }
    // storageRef deliberately stays in the retained tenant/source envelope.
    // The Ready Project needs useful file context, not an internal storage pointer.
    return [{
      fileName: record.fileName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
    }];
  });
}

function conversationTurns(signals: Signal[]): number | null {
  const value = stringSignal(signals, 'conversation_turns');
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function buildKitchenBathReadyProject(
  lead: ReadyProjectLeadSource,
): KitchenBathReadyProject | null {
  const signals = asSignalArray(lead.qualificationSignals);
  if (stringSignal(signals, 'vertical') !== 'KITCHEN_BATH') return null;

  const projectType = allowedStringSignal(
    signals,
    'project_type',
    PROJECT_TYPES,
  );
  const rooms = stringArraySignal(signals, 'rooms');
  const scope = stringSignal(signals, 'scope');
  const intakeHashValue = stringSignal(signals, 'kitchen_bath_intake_hash');
  const intakeHash =
    intakeHashValue && SHA256_RE.test(intakeHashValue) ? intakeHashValue : null;
  const priorities = allowedStringArraySignal(
    signals,
    'priorities',
    PRIORITIES,
  );
  const mustHaves = stringSignal(signals, 'must_haves');
  const concerns = stringSignal(signals, 'concerns');
  const decisionStatus = allowedStringSignal(
    signals,
    'decision_status',
    DECISION_STATUSES,
  );
  const budgetRange = allowedStringSignal(
    signals,
    'budget_range',
    BUDGET_RANGES,
  );
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
      intakeIntegrity: intakeHash ? 'SYSTEM_HASH_PRESENT' : 'MISSING',
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
