import { apiRequest } from './http';

export type OrganizationMemberRole =
  'OWNER' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER' | 'MEMBER';
export type OrganizationInvitationStatus =
  'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED';

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  invitedEmail: string;
  role: OrganizationMemberRole;
  status: OrganizationInvitationStatus;
  invitedById: string;
  expiresAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  /** Present only on GET /invitations/mine. */
  organizationName?: string;
}

const membersBase = (organizationId: string) => `/organizations/${organizationId}/members`;
const invitationsBase = (organizationId: string) => `/organizations/${organizationId}/invitations`;

// ── Members (Step 1 §11 — basic company management) ────────────────────

export function listMembers(
  accessToken: string,
  organizationId: string,
): Promise<OrganizationMember[]> {
  return apiRequest(membersBase(organizationId), { accessToken });
}

export function updateMemberRole(
  accessToken: string,
  organizationId: string,
  userId: string,
  role: OrganizationMemberRole,
): Promise<OrganizationMember> {
  return apiRequest(`${membersBase(organizationId)}/${userId}`, {
    method: 'PATCH',
    accessToken,
    body: { role },
  });
}

export function removeMember(
  accessToken: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  return apiRequest(`${membersBase(organizationId)}/${userId}`, { method: 'DELETE', accessToken });
}

/** Owner-only: hands ownership to another existing member; the caller (if OWNER) is demoted to ADMIN. */
export function transferOwnership(
  accessToken: string,
  organizationId: string,
  newOwnerUserId: string,
): Promise<OrganizationMember> {
  return apiRequest(`${membersBase(organizationId)}/ownership/transfer`, {
    method: 'PATCH',
    accessToken,
    body: { newOwnerUserId },
  });
}

// ── Invitations (Step 1 §8 — the full invitation lifecycle) ────────────

export function listInvitations(
  accessToken: string,
  organizationId: string,
): Promise<OrganizationInvitation[]> {
  return apiRequest(invitationsBase(organizationId), { accessToken });
}

export function inviteMember(
  accessToken: string,
  organizationId: string,
  email: string,
  role?: OrganizationMemberRole,
): Promise<OrganizationInvitation> {
  return apiRequest(invitationsBase(organizationId), {
    method: 'POST',
    accessToken,
    body: { email, ...(role ? { role } : {}) },
  });
}

export function revokeInvitation(
  accessToken: string,
  organizationId: string,
  invitationId: string,
): Promise<void> {
  return apiRequest(`${invitationsBase(organizationId)}/${invitationId}`, {
    method: 'DELETE',
    accessToken,
  });
}

/** Every invitation currently addressed to the caller's own account email, across all organizations. */
export function listMyInvitations(accessToken: string): Promise<OrganizationInvitation[]> {
  return apiRequest('/invitations/mine', { accessToken });
}

export function acceptInvitation(
  accessToken: string,
  invitationId: string,
): Promise<OrganizationInvitation> {
  return apiRequest(`/invitations/${invitationId}/accept`, { method: 'POST', accessToken });
}

export function declineInvitation(
  accessToken: string,
  invitationId: string,
): Promise<OrganizationInvitation> {
  return apiRequest(`/invitations/${invitationId}/decline`, { method: 'POST', accessToken });
}
