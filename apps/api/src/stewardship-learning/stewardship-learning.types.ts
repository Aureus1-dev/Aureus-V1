export type StewardshipLearningProvenance = 'OBSERVED' | 'REPORTED' | 'INFERRED' | 'SIMULATED';

export type StewardshipLearningSignalKind =
  | 'MEMBER_CAPABILITY_REQUEST'
  | 'MEMBER_CORRECTION'
  | 'MEMBER_FRICTION'
  | 'MEMBER_SUGGESTION'
  | 'OUTCOME_REPORTED'
  | 'NO_CURRENT_ROUTE';

export type StewardshipLearningCapabilityHint =
  | 'CALENDAR'
  | 'EMAIL'
  | 'MONEY'
  | 'BILLS'
  | 'BENEFITS'
  | 'EMPLOYMENT'
  | 'BUSINESS'
  | 'TRANSPORTATION'
  | 'APPOINTMENTS'
  | 'DOCUMENTS'
  | 'REMINDERS'
  | 'HUMAN_STEWARD'
  | 'OPPORTUNITIES';

export type OutcomeFeedbackOutcome =
  | 'helped'
  | 'partly_helped'
  | 'not_helped'
  | 'harm_reported'
  | 'unknown';

export interface StewardshipLearningServiceContext {
  contract_version: '1.0.0';
  request_id: string;
  tenant_id: string;
  subject_id: string;
  service_id: 'aureus-v1';
  roles: string[];
  issued_at: string;
  expires_at: string;
}

export interface StewardshipLearningSourceReference {
  system: string;
  record_type: string;
  record_id: string;
  state?: string;
}

/**
 * Runtime projection of the existing product-v1 `outcome_feedback` contract.
 *
 * This is deliberately a candidate, not a new source of truth. Canonical
 * conversation / Responsibility / Needs records remain authoritative and the
 * learning projection stores no raw member transcript or free-form note.
 */
export interface StewardshipLearningCandidate {
  contract_version: '1.0.0';
  context: StewardshipLearningServiceContext;
  event_id: string;
  work_id: string;
  outcome: OutcomeFeedbackOutcome;
  feedback: {
    signal_kind: StewardshipLearningSignalKind;
    source: StewardshipLearningSourceReference;
    source_provenance: StewardshipLearningProvenance;
    classification_provenance: StewardshipLearningProvenance;
    capability_hints: StewardshipLearningCapabilityHint[];
    capabilities_used: string[];
    causal_attribution: 'UNDETERMINED' | 'NOT_APPLICABLE';
  };
  occurred_at: string;
  candidate_only: true;
}

export interface StewardshipLearningCandidatePage {
  contract_version: '1.0.0';
  generated_at: string;
  since: string;
  until: string;
  candidates: StewardshipLearningCandidate[];
}
