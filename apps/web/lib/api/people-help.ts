import { apiRequest } from './http';
import type { GuidedApplicationSessionDto } from './application-guide';

export type PeopleResponsibilityStatus =
  | 'ACTIVE'
  | 'WAITING_ON_AUREUS'
  | 'WAITING_ON_USER'
  | 'WAITING_ON_THIRD_PARTY'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'RESPONSIBLY_EXHAUSTED'
  | 'CANCELLED';

export interface PeopleResponsibilityEventDto {
  id: string;
  type: string;
  actorClass: string;
  actorUserId: string | null;
  fromStatus: PeopleResponsibilityStatus | null;
  toStatus: PeopleResponsibilityStatus | null;
  sourceSystem: string | null;
  sourceRecordType: string | null;
  sourceRecordId: string | null;
  sourceState: string | null;
  evidenceLevel: 'REPORTED' | 'VERIFIED' | null;
  occurredAt: string;
}

export interface PeopleResponsibilityDto {
  id: string;
  kind: 'OPPORTUNITY_DECISION' | 'OPPORTUNITY_APPLICATION_GUIDANCE';
  objective: string;
  status: PeopleResponsibilityStatus;
  contextType: 'PERSONAL';
  authorityClass: 'GUIDANCE_ONLY';
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
  events: PeopleResponsibilityEventDto[];
}

export interface PeopleApplicationHelpDto {
  responsibility: PeopleResponsibilityDto;
  session: GuidedApplicationSessionDto;
}

export interface ActivePeopleApplicationHelpDto {
  session: GuidedApplicationSessionDto | null;
  responsibility: PeopleResponsibilityDto | null;
}

export function startPeopleApplicationHelp(
  accessToken: string,
  conversationId: string,
  opportunityId: string,
): Promise<PeopleApplicationHelpDto> {
  return apiRequest<PeopleApplicationHelpDto>('/people-help/application', {
    method: 'POST',
    accessToken,
    body: { conversationId, opportunityId },
    timeoutMs: 20_000,
  });
}

export function getActivePeopleApplicationHelp(
  accessToken: string,
  conversationId: string,
): Promise<ActivePeopleApplicationHelpDto | null> {
  const query = new URLSearchParams({ conversationId });
  return apiRequest<ActivePeopleApplicationHelpDto | null>(
    `/people-help/application/active?${query.toString()}`,
    { accessToken, timeoutMs: 20_000 },
  );
}

export function pausePeopleApplicationHelp(
  accessToken: string,
  sessionId: string,
): Promise<{ paused: true; responsibility: PeopleResponsibilityDto | null }> {
  return apiRequest<{ paused: true; responsibility: PeopleResponsibilityDto | null }>(
    `/people-help/application/${sessionId}/pause`,
    {
      method: 'POST',
      accessToken,
      timeoutMs: 20_000,
    },
  );
}

export function completePeopleApplicationHelp(
  accessToken: string,
  sessionId: string,
  outcome: 'APPLIED' | 'NOT_INTERESTED',
): Promise<{
  responsibility: PeopleResponsibilityDto;
  ended: true;
  outcome: 'APPLIED' | 'NOT_INTERESTED';
}> {
  return apiRequest(
    `/people-help/application/${sessionId}/outcome`,
    {
      method: 'POST',
      accessToken,
      body: { outcome },
      timeoutMs: 20_000,
    },
  );
}
