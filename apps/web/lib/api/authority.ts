import { apiRequest } from './http';

export type AuthorityContextType = 'PERSONAL' | 'BUSINESS_TENANT';
export type AuthorityCapability = 'SEE' | 'LISTEN' | 'READ' | 'WRITE' | 'SHARE' | 'ACT';
export type AuthorityResourceClass =
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
export type AuthorityShareRecipientKind = 'PERSON' | 'ORGANIZATION' | 'PROVIDER' | 'INSTITUTION' | 'OTHER';

export interface AuthorityRequestDto {
  id: string; contextType: AuthorityContextType; subjectUserId: string | null; organizationId: string | null;
  capability: AuthorityCapability; resourceClass: AuthorityResourceClass; resourceRef: string | null; purpose: string;
  shareRecipientKind: AuthorityShareRecipientKind | null; shareRecipientRef: string | null; shareDataFields: string[];
  source: 'USER' | 'AUREUS' | 'DERIVED_PATTERN'; status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
  canApprove: boolean; canDeny: boolean; createdAt: string;
}
export interface AuthorityGrantDto {
  id: string; contextType: AuthorityContextType; subjectUserId: string | null; organizationId: string | null;
  capability: AuthorityCapability; resourceClass: AuthorityResourceClass; resourceRef: string | null; purpose: string;
  shareRecipientKind: AuthorityShareRecipientKind | null; shareRecipientRef: string | null; shareDataFields: string[];
  status: 'ACTIVE' | 'REVOKED'; expiresAt: string | null; canRevoke: boolean; createdAt: string;
}
export interface AuthorityStateDto {
  id: string; contextType: AuthorityContextType; subjectUserId: string | null; organizationId: string | null;
  capability: AuthorityCapability; status: 'ACTIVE' | 'SUSPENDED'; suspendedReason: string | null; updatedAt: string;
}
export interface AuthorityEventDto {
  id: string; eventType: string; capability: AuthorityCapability | null; resourceClass: AuthorityResourceClass | null;
  reason: string | null; occurredAt: string;
}
export interface AuthorityTrustSnapshot {
  policyVersion: string;
  requests: AuthorityRequestDto[];
  grants: AuthorityGrantDto[];
  states: AuthorityStateDto[];
  events: AuthorityEventDto[];
  decisions: Array<{ id: string; result: string; reason: string; createdAt: string }>;
}

export function getAuthorityTrust(accessToken: string) {
  return apiRequest<AuthorityTrustSnapshot>('/authority/trust', { accessToken });
}
export function approveAuthorityRequest(accessToken: string, id: string) {
  return apiRequest(`/authority/requests/${id}/approve`, { method: 'POST', accessToken, body: {} });
}
export function denyAuthorityRequest(accessToken: string, id: string) {
  return apiRequest(`/authority/requests/${id}/deny`, { method: 'POST', accessToken, body: { reason: 'Not approved' } });
}
export function revokeAuthorityGrant(accessToken: string, id: string) {
  return apiRequest(`/authority/grants/${id}/revoke`, { method: 'POST', accessToken, body: { reason: 'Permission taken back by member' } });
}
export function suspendAuthorityCapability(accessToken: string, grant: AuthorityGrantDto) {
  return apiRequest('/authority/capabilities/suspend', {
    method: 'POST', accessToken,
    body: {
      contextType: grant.contextType, subjectUserId: grant.subjectUserId ?? undefined,
      organizationId: grant.organizationId ?? undefined, capability: grant.capability,
      reason: "Aureus shouldn't have done this",
    },
  });
}
export function resumeAuthorityCapability(accessToken: string, state: AuthorityStateDto) {
  return apiRequest('/authority/capabilities/resume', {
    method: 'POST', accessToken,
    body: {
      contextType: state.contextType, subjectUserId: state.subjectUserId ?? undefined,
      organizationId: state.organizationId ?? undefined, capability: state.capability,
    },
  });
}
