import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/pods/**\/dto/*` exactly (FPB-009 §8).
 * Pods is the largest backend domain (11 controllers) but this client
 * covers only the member-facing "Freedom of Belonging" journey (PR-002):
 * browse Pods, view one, join/leave/reassign/propose via Requests,
 * respond to Invitations and proactive Home Pod suggestions via
 * Memberships. Steward/Admin-facing roster management, events, meeting
 * schedule, service projects, escalations, and Pod-internal messaging
 * remain a documented follow-up beyond this pass.
 */
export type PodType = 'HOME' | 'INTEREST';
export type PodStatus = 'FORMING' | 'ACTIVE' | 'DORMANT' | 'ARCHIVED';

export interface PodDto {
  id: string;
  podRef: string | null;
  name: string;
  shortDescription: string;
  fullDescription: string;
  type: PodType;
  status: PodStatus;
  capacity: number;
  primaryLanguage: string | null;
  city: string | null;
  region: string | null;
  stateProvince: string | null;
  country: string | null;
  dormancyThresholdDays: number;
  parentPodId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPodsDto {
  data: PodDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListPodsParams {
  page?: number;
  limit?: number;
  q?: string;
  type?: PodType;
  status?: PodStatus;
}

export function listPods(accessToken: string, params: ListPodsParams = {}): Promise<PaginatedPodsDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.q) query.set('q', params.q);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedPodsDto>(`/pods${suffix}`, { accessToken });
}

export function getPod(accessToken: string, id: string): Promise<PodDto> {
  return apiRequest<PodDto>(`/pods/${id}`, { accessToken });
}

// ── Memberships (mine) ───────────────────────────────────────────────────

export type PodMemberRole = 'MEMBER' | 'STEWARD';
export type PodMembershipStatus = 'PENDING' | 'ACTIVE' | 'DECLINED' | 'DEFERRED' | 'ENDED';
export type PodMembershipOrigin = 'MEMBER_REQUEST' | 'AI_MATCH_SUGGESTION' | 'STEWARD_INVITATION' | 'ADMIN_ASSIGNMENT';
export type MembershipResponseDecision = 'ACCEPT' | 'DECLINE' | 'DEFER';

export interface MembershipDto {
  id: string;
  podId: string;
  userId: string;
  role: PodMemberRole;
  status: PodMembershipStatus;
  origin: PodMembershipOrigin;
  invitedById: string | null;
  joinedAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listMyMemberships(accessToken: string): Promise<MembershipDto[]> {
  return apiRequest<MembershipDto[]>('/pods/memberships/mine', { accessToken });
}

export function respondToMembership(
  accessToken: string,
  membershipId: string,
  decision: MembershipResponseDecision,
): Promise<MembershipDto> {
  return apiRequest<MembershipDto>(`/pods/memberships/${membershipId}/respond`, {
    method: 'POST', accessToken, body: { decision },
  });
}

export function leaveMembership(accessToken: string, membershipId: string): Promise<MembershipDto> {
  return apiRequest<MembershipDto>(`/pods/memberships/${membershipId}/leave`, { method: 'POST', accessToken });
}

// ── Requests (mine) ──────────────────────────────────────────────────────

export type PodRequestType = 'JOIN' | 'LEAVE' | 'REASSIGNMENT' | 'PROPOSE_NEW_POD';
export type PodRequestStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'WITHDRAWN';

export interface RequestDto {
  id: string;
  userId: string;
  type: PodRequestType;
  podId: string | null;
  proposedPodName: string | null;
  proposedPodDescription: string | null;
  reason: string | null;
  status: PodRequestStatus;
  decidedById: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface CreateRequestInput {
  type: PodRequestType;
  podId?: string;
  proposedPodName?: string;
  proposedPodDescription?: string;
  reason?: string;
}

export function createPodRequest(accessToken: string, input: CreateRequestInput): Promise<RequestDto> {
  return apiRequest<RequestDto>('/pods/requests', { method: 'POST', accessToken, body: input });
}

export function listMyPodRequests(accessToken: string): Promise<RequestDto[]> {
  return apiRequest<RequestDto[]>('/pods/requests/mine', { accessToken });
}

export function withdrawPodRequest(accessToken: string, id: string): Promise<RequestDto> {
  return apiRequest<RequestDto>(`/pods/requests/${id}/withdraw`, { method: 'POST', accessToken });
}

// ── Invitations (received) ───────────────────────────────────────────────

export type PodInvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface InvitationDto {
  id: string;
  podId: string;
  invitedUserId: string;
  invitedById: string;
  message: string | null;
  status: PodInvitationStatus;
  respondedAt: string | null;
  createdAt: string;
}

export function listMyInvitations(accessToken: string): Promise<InvitationDto[]> {
  return apiRequest<InvitationDto[]>('/pods/invitations/mine', { accessToken });
}

export function respondToInvitation(
  accessToken: string,
  invitationId: string,
  decision: 'ACCEPT' | 'DECLINE',
): Promise<InvitationDto> {
  return apiRequest<InvitationDto>(`/pods/invitations/${invitationId}/respond`, {
    method: 'POST', accessToken, body: { decision },
  });
}
