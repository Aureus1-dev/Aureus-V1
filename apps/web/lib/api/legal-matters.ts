import { apiRequest } from './http';

export type LegalMatterUrgency = 'ROUTINE' | 'TIME_SENSITIVE' | 'URGENT' | 'EMERGENCY';
export type LegalMatterProvenance = 'OBSERVED' | 'REPORTED' | 'INFERRED' | 'SIMULATED';
export type LegalMatterSourceVerification = 'MEMBER_REPORTED' | 'IDENTITY_VERIFIED';

export interface LegalMatterSourceDto {
  id: string;
  title: string;
  url: string;
  kind: 'OFFICIAL_PRIMARY' | 'OFFICIAL_PROCEDURE' | 'SECONDARY_EXPLANATORY' | 'MEMBER_RECORD' | 'OTHER';
  jurisdiction: string;
  proposition: string;
  provenance: LegalMatterProvenance;
  verification: LegalMatterSourceVerification;
  checkedAt: string;
  verifiedAt: string | null;
  verificationNote: string | null;
  createdAt: string;
}

export interface LegalMatterFactDto {
  id: string;
  statement: string;
  provenance: LegalMatterProvenance;
  sourceId: string | null;
  observedAt: string | null;
  createdAt: string;
}

export interface LegalMatterDeadlineDto {
  id: string;
  label: string;
  dueAt: string;
  timeZone: string;
  trigger: string;
  calculationBasis: string | null;
  sourceId: string | null;
  status: 'REPORTED' | 'VERIFIED' | 'COMPLETED' | 'REVIEW_REQUIRED';
  completedAt: string | null;
}

export interface LegalAidResourceDto {
  id: string;
  organizationName: string;
  description: string;
  phone: string | null;
  website: string | null;
  hours: string;
  serviceArea: string;
  eligibilityRequirements: string | null;
  verificationStatus: string;
}

export interface LegalMatterDto {
  id: string;
  userId: string;
  responsibilityId: string;
  statedNeedId: string;
  matterType: string;
  jurisdiction: string;
  forum: string | null;
  proceduralPosture: string;
  urgency: LegalMatterUrgency;
  disclosureAcknowledgedAt: string;
  assistanceMode: string;
  legalReviewRequired: boolean;
  outcomeSummary: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  responsibility: {
    id: string;
    objective: string;
    status: string;
    kind: string;
    events: Array<{
      id: string;
      type: string;
      sourceRecordType: string | null;
      sourceState: string | null;
      evidenceLevel: 'REPORTED' | 'VERIFIED' | null;
      occurredAt: string;
    }>;
  };
  sources: LegalMatterSourceDto[];
  facts: LegalMatterFactDto[];
  deadlines: LegalMatterDeadlineDto[];
  reviewRequests: Array<{
    id: string;
    purpose: string;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
  }>;
  documentLinks: Array<{
    id: string;
    label: string | null;
    document: {
      id: string;
      title: string;
      originalFilename: string;
      mimeType: string;
      uploadedAt: string;
    };
  }>;
  legalAidResources: LegalAidResourceDto[];
  representationRouting: {
    publicDefenderAutomaticallyAssumed: false;
    route: string;
    note: string;
  };
  jurisdictionGate: {
    status: 'SAFE_MODE_ONLY' | 'ENABLED' | 'DISABLED';
    sourceUrl: string | null;
    checkedAt: string | null;
    effectiveAt: string | null;
    notes: string | null;
  };
  retention: {
    basis: string;
    state: 'ACTIVE' | 'REVIEW_REQUIRED' | 'PRESERVED' | 'ELIGIBLE_FOR_DELETION';
    reviewAt: string | null;
    legalHoldBasis: string | null;
  };
}

export interface CreateLegalMatterInput {
  statedNeedId: string;
  objective: string;
  jurisdiction: string;
  forum?: string;
  matterType: string;
  proceduralPosture: string;
  urgency: LegalMatterUrgency;
  disclosureAccepted: true;
}

export function getActiveLegalMatter(
  accessToken: string,
  conversationId: string,
): Promise<LegalMatterDto | null> {
  const query = new URLSearchParams({ conversationId });
  return apiRequest<LegalMatterDto | null>(`/people/legal-matters/active?${query.toString()}`, {
    accessToken,
    timeoutMs: 20_000,
  });
}

export function createLegalMatter(
  accessToken: string,
  input: CreateLegalMatterInput,
): Promise<LegalMatterDto> {
  return apiRequest<LegalMatterDto>('/people/legal-matters', {
    method: 'POST',
    accessToken,
    body: input,
    timeoutMs: 20_000,
  });
}

export function addLegalMatterSource(
  accessToken: string,
  matterId: string,
  input: {
    title: string;
    url: string;
    kind: LegalMatterSourceDto['kind'];
    jurisdiction: string;
    proposition: string;
  },
): Promise<LegalMatterSourceDto> {
  return apiRequest<LegalMatterSourceDto>(`/people/legal-matters/${matterId}/sources`, {
    method: 'POST',
    accessToken,
    body: input,
    timeoutMs: 20_000,
  });
}

export function addLegalMatterFact(
  accessToken: string,
  matterId: string,
  statement: string,
): Promise<LegalMatterFactDto> {
  return apiRequest<LegalMatterFactDto>(`/people/legal-matters/${matterId}/facts`, {
    method: 'POST',
    accessToken,
    body: { statement },
    timeoutMs: 20_000,
  });
}

export function addLegalMatterDeadline(
  accessToken: string,
  matterId: string,
  input: {
    label: string;
    dueAt: string;
    timeZone: string;
    trigger: string;
    calculationBasis?: string;
    sourceId?: string;
  },
): Promise<LegalMatterDeadlineDto> {
  return apiRequest<LegalMatterDeadlineDto>(`/people/legal-matters/${matterId}/deadlines`, {
    method: 'POST',
    accessToken,
    body: input,
    timeoutMs: 20_000,
  });
}

export function requestLegalReview(
  accessToken: string,
  matterId: string,
  purpose: string,
) {
  return apiRequest(`/people/legal-matters/${matterId}/legal-review`, {
    method: 'POST',
    accessToken,
    body: { purpose },
    timeoutMs: 20_000,
  });
}

export function checkLegalAction(
  accessToken: string,
  matterId: string,
  actionType:
    | 'ORGANIZE_RECORDS'
    | 'RETRIEVE_OFFICIAL_SOURCE'
    | 'TRACK_REPORTED_DEADLINE'
    | 'PREPARE_QUESTIONS'
    | 'FILE'
    | 'SERVE'
    | 'SIGN'
    | 'CERTIFY'
    | 'TESTIFY'
    | 'SETTLE'
    | 'PLEAD'
    | 'APPEAL'
    | 'WAIVE'
    | 'REPRESENT',
): Promise<{ actionType: string; permitted: boolean; mode: string; gate?: string; reason: string }> {
  return apiRequest(`/people/legal-matters/${matterId}/action-check`, {
    method: 'POST',
    accessToken,
    body: { actionType },
    timeoutMs: 20_000,
  });
}

export function reportLegalMatterOutcome(
  accessToken: string,
  matterId: string,
  resolved: boolean,
  note?: string,
): Promise<LegalMatterDto> {
  return apiRequest<LegalMatterDto>(`/people/legal-matters/${matterId}/outcome`, {
    method: 'POST',
    accessToken,
    body: { resolved, note },
    timeoutMs: 20_000,
  });
}

export function getLegalPreparationPacket(accessToken: string, matterId: string) {
  return apiRequest<{
    matterId: string;
    responsibilityId: string;
    summary: string;
    jurisdiction: string;
    forum: string | null;
    proceduralPosture: string;
    urgency: LegalMatterUrgency;
    deadlines: LegalMatterDeadlineDto[];
    facts: LegalMatterFactDto[];
    sources: LegalMatterSourceDto[];
    legalAidResources: LegalAidResourceDto[];
    representationRouting: {
      publicDefenderAutomaticallyAssumed: false;
      route: string;
      note: string;
    };
    unresolvedLegalQuestions: string[];
    memberDecisionsRemainWithMember: true;
    legalReviewRequired: boolean;
  }>(`/people/legal-matters/${matterId}/preparation-packet`, {
    accessToken,
    timeoutMs: 20_000,
  });
}
