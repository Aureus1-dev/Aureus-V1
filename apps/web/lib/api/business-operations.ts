import { apiRequest } from './http';
import type { KitchenBathReadyProject } from './kitchen-bath';

export type WardLeadStatus = 'SUBMITTED' | 'ACCEPTED' | 'CONTACTED' | 'CLOSED' | 'LOST';

export interface BusinessOperationsSummary {
  generatedAt: string;
  pipeline: {
    total: number;
    counts: Record<WardLeadStatus, number>;
    awaitingNotification: number;
    oldestOpenSubmittedAt: string | null;
  };
  routing: {
    publicStatus: string;
    businessHours: unknown;
    contactRoutes: unknown[];
    escalationTarget: unknown;
    fallbackRule: string;
    updatedAt: string | null;
  };
  knowledge: {
    total: number;
    currentApproved: number;
    dueOrReviewing: number;
    queue: Array<{
      id: string;
      title: string;
      status: string;
      nextReviewAt: string;
      reviewedAt: string | null;
      accountableReviewerId: string;
    }>;
  };
  provider: {
    basis: string;
    windowStartedAt: string;
    status: 'NO_TRAFFIC' | 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
    requests: number;
    successes: number;
    failures: number;
    moderationBlocks: number;
    spendUsd: number;
    averageLatencyMs: number | null;
    latestObservedAt: string | null;
    providers: Array<{ provider: string; model: string }>;
  };
  owners: Array<{
    userId: string;
    role: string;
    email: string;
    displayName: string | null;
  }>;
}

export interface BusinessLeadSummary {
  id: string;
  displayName: string;
  contactMethod: string;
  contactValue: string;
  projectSummary: string;
  projectLocation: string | null;
  desiredTiming: string | null;
  qualificationSignals: unknown;
  status: WardLeadStatus;
  assignedToId: string;
  submittedAt: string;
  lastStateChangedAt: string;
  retentionExpiresAt: string;
  assignmentNotifiedAt: string | null;
  assignee: {
    user: { id: string; email: string; profile: { displayName: string | null } | null };
  } | null;
}

export interface BusinessLeadDetail extends BusinessLeadSummary {
  outcomeReason: string | null;
  readyProject: KitchenBathReadyProject | null;
  events: Array<{
    id: string;
    type: string;
    fromStatus: WardLeadStatus | null;
    toStatus: WardLeadStatus | null;
    reason: string | null;
    occurredAt: string;
  }>;
  conversation: {
    id: string;
    status: string;
    turnCount: number;
    createdAt: string;
    messages: Array<{
      id: string;
      role: 'VISITOR' | 'WARD';
      content: string;
      responseKind: string | null;
      createdAt: string;
      sources: Array<{
        knowledgeRecordId: string;
        sourceTitle: string;
        sourceUrl: string | null;
        sourceReviewedAt: string;
        sourceContentSha256: string;
      }>;
    }>;
  };
}

const operationsBase = (tenantId: string) => `/organizations/${tenantId}/business-operations`;
const leadsBase = (tenantId: string) => `/organizations/${tenantId}/business-leads`;

export function getBusinessOperationsSummary(
  accessToken: string,
  tenantId: string,
): Promise<BusinessOperationsSummary> {
  return apiRequest(`${operationsBase(tenantId)}/summary`, { accessToken });
}

export function exportBusinessOperations(accessToken: string, tenantId: string): Promise<unknown> {
  return apiRequest(`${operationsBase(tenantId)}/export`, { accessToken });
}

export function listBusinessLeads(
  accessToken: string,
  tenantId: string,
): Promise<BusinessLeadSummary[]> {
  return apiRequest(leadsBase(tenantId), { accessToken });
}

export function getBusinessLead(
  accessToken: string,
  tenantId: string,
  leadId: string,
): Promise<BusinessLeadDetail> {
  return apiRequest(`${leadsBase(tenantId)}/${leadId}`, { accessToken });
}

export function assignBusinessLead(
  accessToken: string,
  tenantId: string,
  leadId: string,
  assignedToId: string,
): Promise<BusinessLeadDetail> {
  return apiRequest(`${leadsBase(tenantId)}/${leadId}/assignment`, {
    method: 'PATCH',
    accessToken,
    body: { assignedToId },
  });
}

export function transitionBusinessLead(
  accessToken: string,
  tenantId: string,
  leadId: string,
  status: WardLeadStatus,
  reason?: string,
): Promise<BusinessLeadDetail> {
  return apiRequest(`${leadsBase(tenantId)}/${leadId}/status`, {
    method: 'PATCH',
    accessToken,
    body: { status, ...(reason ? { reason } : {}) },
  });
}
