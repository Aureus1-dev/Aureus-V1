import { apiRequest } from './http';

/**
 * Step 5 — Business Owner Experience.
 *
 * Client for the canonical Step 3/Step 4 Business Responsibility API
 * (`apps/api/src/responsibilities/business-responsibilities.controller.ts`).
 * Step 5 owns no persistence and no authority of its own: every read and
 * every state change below is the tenant-scoped server endpoint, so the
 * organization boundary and the role rules are enforced where they already
 * live rather than re-implemented in the browser.
 */

export type ResponsibilityStatus =
  | 'ACTIVE'
  | 'WAITING_ON_AUREUS'
  | 'WAITING_ON_USER'
  | 'WAITING_ON_THIRD_PARTY'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'RESPONSIBLY_EXHAUSTED'
  | 'CANCELLED';

export type ResponsibilityEvidenceLevel = 'REPORTED' | 'VERIFIED';

export type ResponsibilityActorClass = 'MEMBER' | 'AUREUS' | 'SYSTEM' | 'EXTERNAL';

export interface BusinessResponsibilityEventDto {
  id: string;
  type: string;
  actorClass: ResponsibilityActorClass;
  actorUserId: string | null;
  fromStatus: ResponsibilityStatus | null;
  toStatus: ResponsibilityStatus | null;
  sourceSystem: string | null;
  sourceRecordType: string | null;
  sourceRecordId: string | null;
  sourceState: string | null;
  evidenceLevel: ResponsibilityEvidenceLevel | null;
  occurredAt: string;
}

/** Mirrors `ResponsibilityResponseDto`. */
export interface BusinessResponsibilityDto {
  id: string;
  kind: string;
  objective: string;
  status: ResponsibilityStatus;
  contextType: string;
  authorityClass: string;
  authorityPolicyVersion: string;
  privacyScope: string;
  privacyPolicyVersion: string;
  originConversationId: string | null;
  originOpportunityId: string | null;
  successCriteria: unknown;
  dueAt: string | null;
  retentionExpiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  events: BusinessResponsibilityEventDto[];
}

/**
 * Mirrors `BusinessResponsibilityEvidenceDto`. This receipt is the only
 * admissible source of completion/evidence language in Step 5 — evidence is
 * never reconstructed from notification copy or conversational text.
 */
export interface BusinessResponsibilityEvidenceReceipt {
  responsibilityId: string;
  organizationId: string | null;
  objective: string;
  promise: string | null;
  criterion: string | null;
  status: ResponsibilityStatus;
  dueAt: string | null;
  completedAt: string | null;
  evidenceSummary: string;
  lifecycle: Array<{
    eventId: string;
    type: string;
    actorClass: ResponsibilityActorClass;
    actorUserId: string | null;
    occurredAt: string;
    fromStatus: ResponsibilityStatus | null;
    toStatus: ResponsibilityStatus | null;
    sourceSystem: string | null;
    sourceRecordType: string | null;
    sourceRecordId: string | null;
    sourceState: string | null;
    evidenceLevel: ResponsibilityEvidenceLevel | null;
  }>;
}

function base(organizationId: string): string {
  return `/organizations/${encodeURIComponent(organizationId)}/responsibilities`;
}

export function listBusinessResponsibilities(
  accessToken: string,
  organizationId: string,
  signal?: AbortSignal,
): Promise<BusinessResponsibilityDto[]> {
  return apiRequest<BusinessResponsibilityDto[]>(base(organizationId), { accessToken, signal });
}

export function getBusinessResponsibility(
  accessToken: string,
  organizationId: string,
  responsibilityId: string,
  signal?: AbortSignal,
): Promise<BusinessResponsibilityDto> {
  return apiRequest<BusinessResponsibilityDto>(
    `${base(organizationId)}/${encodeURIComponent(responsibilityId)}`,
    { accessToken, signal },
  );
}

export function getBusinessResponsibilityEvidence(
  accessToken: string,
  organizationId: string,
  responsibilityId: string,
  signal?: AbortSignal,
): Promise<BusinessResponsibilityEvidenceReceipt> {
  return apiRequest<BusinessResponsibilityEvidenceReceipt>(
    `${base(organizationId)}/${encodeURIComponent(responsibilityId)}/evidence`,
    { accessToken, signal },
  );
}

/** Step 3 lifecycle mutations. Step 5 never changes state by any other route. */

export function markBusinessResponsibilityNeedsYou(
  accessToken: string,
  organizationId: string,
  responsibilityId: string,
): Promise<BusinessResponsibilityDto> {
  return apiRequest<BusinessResponsibilityDto>(
    `${base(organizationId)}/${encodeURIComponent(responsibilityId)}/needs-you`,
    { method: 'POST', accessToken },
  );
}

export function resumeBusinessResponsibility(
  accessToken: string,
  organizationId: string,
  responsibilityId: string,
): Promise<BusinessResponsibilityDto> {
  return apiRequest<BusinessResponsibilityDto>(
    `${base(organizationId)}/${encodeURIComponent(responsibilityId)}/resume`,
    { method: 'POST', accessToken },
  );
}

export function confirmBusinessResponsibilityCompletion(
  accessToken: string,
  organizationId: string,
  responsibilityId: string,
): Promise<BusinessResponsibilityDto> {
  return apiRequest<BusinessResponsibilityDto>(
    `${base(organizationId)}/${encodeURIComponent(responsibilityId)}/complete`,
    { method: 'POST', accessToken, body: { confirmed: true } },
  );
}

export function cancelBusinessResponsibility(
  accessToken: string,
  organizationId: string,
  responsibilityId: string,
): Promise<BusinessResponsibilityDto> {
  return apiRequest<BusinessResponsibilityDto>(
    `${base(organizationId)}/${encodeURIComponent(responsibilityId)}/cancel`,
    { method: 'POST', accessToken },
  );
}
