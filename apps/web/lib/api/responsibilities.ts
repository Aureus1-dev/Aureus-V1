import { apiRequest } from './http';

export type ResponsibilityStatus =
  | 'ACTIVE'
  | 'WAITING_ON_AUREUS'
  | 'WAITING_ON_USER'
  | 'WAITING_ON_THIRD_PARTY'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'RESPONSIBLY_EXHAUSTED'
  | 'CANCELLED';

export type ResponsibilityKind =
  | 'OPPORTUNITY_DECISION'
  | 'OPPORTUNITY_APPLICATION_GUIDANCE'
  | 'PERSONAL_NEED_RESOLUTION';

export interface ResponsibilityEventDto {
  id: string;
  type: string;
  actorClass: string;
  actorUserId: string | null;
  fromStatus: ResponsibilityStatus | null;
  toStatus: ResponsibilityStatus | null;
  sourceSystem: string | null;
  sourceRecordType: string | null;
  sourceRecordId: string | null;
  sourceState: string | null;
  evidenceLevel: 'REPORTED' | 'VERIFIED' | null;
  occurredAt: string;
}

export interface ResponsibilityDto {
  id: string;
  kind: ResponsibilityKind;
  objective: string;
  status: ResponsibilityStatus;
  contextType: 'PERSONAL';
  authorityClass: string;
  authorityPolicyVersion: string;
  privacyScope: 'PERSONAL_PRIVATE';
  privacyPolicyVersion: string;
  originConversationId: string | null;
  originOpportunityId: string | null;
  successCriteria: unknown;
  dueAt: string | null;
  retentionExpiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  events: ResponsibilityEventDto[];
}

export function getMyResponsibilities(accessToken: string): Promise<ResponsibilityDto[]> {
  return apiRequest<ResponsibilityDto[]>('/responsibilities', { accessToken });
}
