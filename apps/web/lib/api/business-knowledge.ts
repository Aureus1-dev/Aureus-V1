import { apiRequest } from './http';

export type BusinessKnowledgeType =
  | 'SERVICE'
  | 'FAQ'
  | 'POLICY'
  | 'PRICING_BOUNDARY'
  | 'GEOGRAPHY'
  | 'QUALIFICATION'
  | 'ESCALATION';

export type BusinessKnowledgeStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export interface BusinessKnowledgeRecord {
  id: string;
  organizationId: string;
  title: string;
  summary: string;
  content: string;
  knowledgeType: BusinessKnowledgeType;
  status: BusinessKnowledgeStatus;
  sourceKind: 'MANUAL' | 'IMPORT';
  sourceReference: string;
  sourceUrl: string | null;
  sourceFileName: string | null;
  sourceMimeType: string | null;
  freshnessIntervalDays: number;
  nextReviewAt: string;
  accountableReviewerId: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  updatedAt: string;
}

export interface CreateBusinessKnowledgeInput {
  title: string;
  summary: string;
  content: string;
  knowledgeType: BusinessKnowledgeType;
  sourceReference: string;
  sourceUrl?: string;
  freshnessIntervalDays: number;
}

export interface CreateBusinessKnowledgeCorrectionInput extends CreateBusinessKnowledgeInput {
  correctionReason: string;
}

export interface ImportBusinessKnowledgeInput extends CreateBusinessKnowledgeInput {
  fileName: string;
  mimeType: 'text/plain' | 'text/markdown';
  acknowledgeUnverifiedSource: true;
}

const base = (tenantId: string) => `/organizations/${tenantId}/business-knowledge`;

export function listBusinessKnowledge(
  accessToken: string,
  tenantId: string,
): Promise<BusinessKnowledgeRecord[]> {
  return apiRequest(base(tenantId), { accessToken });
}

export function createBusinessKnowledge(
  accessToken: string,
  tenantId: string,
  input: CreateBusinessKnowledgeInput,
): Promise<BusinessKnowledgeRecord> {
  return apiRequest(base(tenantId), { method: 'POST', accessToken, body: input });
}

export function createBusinessKnowledgeCorrection(
  accessToken: string,
  tenantId: string,
  id: string,
  input: CreateBusinessKnowledgeCorrectionInput,
): Promise<BusinessKnowledgeRecord & {
  correctionOf: string;
  correctionReason: string;
  originalRemainsLive: true;
}> {
  return apiRequest(`${base(tenantId)}/${id}/correction`, {
    method: 'POST',
    accessToken,
    body: input,
  });
}

export function importBusinessKnowledge(
  accessToken: string,
  tenantId: string,
  input: ImportBusinessKnowledgeInput,
): Promise<BusinessKnowledgeRecord> {
  return apiRequest(`${base(tenantId)}/import`, { method: 'POST', accessToken, body: input });
}

export function submitBusinessKnowledge(
  accessToken: string,
  tenantId: string,
  id: string,
): Promise<BusinessKnowledgeRecord> {
  return apiRequest(`${base(tenantId)}/${id}/submit`, { method: 'POST', accessToken });
}

export function approveBusinessKnowledge(
  accessToken: string,
  tenantId: string,
  id: string,
): Promise<BusinessKnowledgeRecord> {
  return apiRequest(`${base(tenantId)}/${id}/approve`, { method: 'POST', accessToken });
}

export function rejectBusinessKnowledge(
  accessToken: string,
  tenantId: string,
  id: string,
  reason: string,
): Promise<BusinessKnowledgeRecord> {
  return apiRequest(`${base(tenantId)}/${id}/reject`, {
    method: 'POST',
    accessToken,
    body: { reason },
  });
}

export function createLibraryCandidate(
  accessToken: string,
  tenantId: string,
  id: string,
): Promise<{ id: string; payloadSha256: string; status: 'PENDING' }> {
  return apiRequest(`${base(tenantId)}/${id}/library-candidate`, {
    method: 'POST',
    accessToken,
  });
}
