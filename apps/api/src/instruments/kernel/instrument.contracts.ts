export const INSTRUMENT_BLUEPRINT_SCHEMA = 'instrument-blueprint/v1' as const;
export const INSTRUMENT_INSTANCE_SCHEMA = 'instrument-instance/v1' as const;

/**
 * The Blueprint is reusable product intelligence. It must never contain one
 * customer's private state. The Instance is the private deployment of that
 * Blueprint for one owner. Keeping those concepts separate is the core
 * privacy/distribution boundary for every Aureus Instrument.
 */
export type InstrumentLifecycle =
  | 'DRAFT'
  | 'READY'
  | 'ACTIVE'
  | 'PAUSED'
  | 'RETIRED'
  | 'GRADUATED';

export type InstrumentOwnerKind = 'USER' | 'ORGANIZATION';
export type InstrumentDistribution = 'PRIVATE' | 'AUREUS_CATALOG' | 'PARTNER_CATALOG';
export type InstrumentExecutionClass = 'RESEARCH' | 'PRODUCE' | 'PREPARE' | 'EXTERNAL_MUTATION';
export type InstrumentRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type InstrumentVerifier = 'EXECUTOR' | 'INDEPENDENT' | 'HUMAN';
export type InstrumentAuthorityDecision = 'PERMIT' | 'NEEDS_APPROVAL' | 'DENY';

export type InstrumentAuthorityCapability = 'SEE' | 'LISTEN' | 'READ' | 'WRITE' | 'SHARE' | 'ACT';

export type InstrumentAuthorityResourceClass =
  | 'MICROPHONE'
  | 'SCREEN'
  | 'CONVERSATION'
  | 'CONNECTED_ACCOUNT'
  | 'DOCUMENT'
  | 'CALENDAR'
  | 'EMAIL'
  | 'FILES'
  | 'BUSINESS_DATA'
  | 'OTHER';

export interface InstrumentBlueprintRef {
  key: string;
  version: string;
}

export interface InstrumentOwnerRef {
  kind: InstrumentOwnerKind;
  id: string;
}

export interface InstrumentAuthorityRequirement {
  key: string;
  capability: InstrumentAuthorityCapability;
  resourceClass: InstrumentAuthorityResourceClass;
  purpose: string;
  /**
   * EXACT_AT_RUNTIME means the executor must supply the concrete resource id
   * to the existing AuthorityService before execution. INSTANCE_SCOPED is for
   * resources owned by the private Instrument instance/business context.
   */
  resourceRefPolicy: 'NONE' | 'EXACT_AT_RUNTIME' | 'INSTANCE_SCOPED';
}

export interface InstrumentEvidenceRequirement {
  key: string;
  description: string;
  required: boolean;
  verifier: InstrumentVerifier;
}

export interface InstrumentCompletionContract {
  /** Human-readable observable truth that proves this action is done. */
  criterion: string;
  /** At least one required evidence key must prove consequential work. */
  evidenceKeys: string[];
}

export interface InstrumentActionDefinition {
  key: string;
  name: string;
  purpose: string;
  executionClass: InstrumentExecutionClass;
  risk: InstrumentRisk;
  reversible: boolean;
  /** External mutations must be safe to retry. */
  requiresIdempotencyKey: boolean;
  authority: InstrumentAuthorityRequirement[];
  evidence: InstrumentEvidenceRequirement[];
  completion: InstrumentCompletionContract;
}

export interface InstrumentWorkflowDefinition {
  key: string;
  name: string;
  purpose: string;
  actions: InstrumentActionDefinition[];
}

export interface InstrumentBlueprint {
  schemaVersion: typeof INSTRUMENT_BLUEPRINT_SCHEMA;
  key: string;
  version: string;
  name: string;
  domain: string;
  purpose: string;
  distribution: InstrumentDistribution;
  /**
   * Names only the classes of information the Blueprint knows how to work
   * with. Private values belong exclusively to InstrumentInstance/runtime
   * state and never belong in this object.
   */
  declaredDataClasses: string[];
  workflows: InstrumentWorkflowDefinition[];
}

export interface InstrumentInstance {
  schemaVersion: typeof INSTRUMENT_INSTANCE_SCHEMA;
  id: string;
  blueprint: InstrumentBlueprintRef;
  owner: InstrumentOwnerRef;
  /** Opaque private namespace. Never reused across owners or instances. */
  workspaceKey: string;
  lifecycle: InstrumentLifecycle;
  /** The owner's desired outcome for this deployment, not catalog copy. */
  objective: string;
  createdAt: string;
  updatedAt: string;
  /** Set only when the Instrument graduates into a full business tenant. */
  graduatedBusinessTenantId?: string;
}

export interface InstrumentExecutionRequest {
  instance: InstrumentInstance;
  blueprint: InstrumentBlueprint;
  workflowKey: string;
  actionKey: string;
  idempotencyKey?: string;
  /** One current AuthorityService decision per requirement key. */
  authorityDecisions: Record<string, InstrumentAuthorityDecision>;
}

export interface InstrumentKernelIssue {
  code: string;
  message: string;
  path: string;
}

export interface InstrumentKernelValidation {
  valid: boolean;
  issues: InstrumentKernelIssue[];
}

export interface InstrumentExecutionAssessment {
  decision: InstrumentAuthorityDecision;
  reasons: string[];
  workflow?: InstrumentWorkflowDefinition;
  action?: InstrumentActionDefinition;
}
