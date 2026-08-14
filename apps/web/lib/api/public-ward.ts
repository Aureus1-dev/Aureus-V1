import { apiRequest } from './http';

export type WardConversationStatus =
  'OPEN' | 'ESCALATION_OFFERED' | 'ESCALATED' | 'CLOSED' | 'EXPIRED';

export type WardResponseKind = 'OPENING' | 'GROUNDED' | 'UNKNOWN' | 'ESCALATION' | 'SAFETY';

export interface PublicWardContact {
  type: 'PHONE' | 'SMS' | 'EMAIL' | 'WEBSITE';
  value: string;
  label?: string;
}

export interface PublicWardProfile {
  slug: string;
  name: string;
  description: string;
  websiteUrl: string;
  serviceArea: { cities?: string[]; states?: string[]; postalCodes?: string[]; remote?: boolean };
  businessHours: Record<string, string>;
  contactRoutes: PublicWardContact[];
  handoff: {
    consentVersion: 'lead-handoff-v1';
    consentText: string;
    consentTextSha256: string;
    dataClasses: ['identity', 'contact', 'project', 'conversation'];
    retentionDays: number;
    minimumFields: string[];
  };
  notice: string;
}

export type WardLeadStatus = 'SUBMITTED' | 'ACCEPTED' | 'CONTACTED' | 'CLOSED' | 'LOST';
export type WardLeadContactMethod = 'EMAIL' | 'PHONE' | 'SMS';
export type WardLeadDesiredTiming =
  | 'AS_SOON_AS_POSSIBLE'
  | 'WITHIN_ONE_MONTH'
  | 'ONE_TO_THREE_MONTHS'
  | 'THREE_TO_SIX_MONTHS'
  | 'EXPLORING';

export interface PublicWardHandoff {
  handoffId: string;
  status: WardLeadStatus;
  preferredContactMethod: WardLeadContactMethod;
  submittedAt: string;
  retentionExpiresAt: string;
  confirmation: string;
}

export interface CreatePublicWardHandoff {
  displayName: string;
  contactMethod: WardLeadContactMethod;
  contactValue: string;
  projectSummary: string;
  projectLocation?: string;
  desiredTiming?: WardLeadDesiredTiming;
  consentVersion: 'lead-handoff-v1';
  consentTextSha256: string;
  consentGranted: true;
}

export interface PublicWardMessage {
  id: string;
  role: 'VISITOR' | 'WARD';
  content: string;
  responseKind: WardResponseKind | null;
  createdAt: string;
  sources: Array<{ title: string; url: string | null; reviewedAt: string }>;
}

export interface PublicWardConversation {
  conversationId: string;
  status: WardConversationStatus;
  remainingTurns: number;
  profile: PublicWardProfile;
  handoff: PublicWardHandoff | null;
  messages: PublicWardMessage[];
}

export interface StartedPublicWardConversation extends PublicWardConversation {
  accessToken: string;
  tokenExpiresAt: string;
  expiresAt: string;
}

export interface WardMessageResult {
  conversationId: string;
  status: WardConversationStatus;
  remainingTurns: number;
  visitorMessage: PublicWardMessage;
  message: PublicWardMessage;
  humanContact: PublicWardContact | null;
}

const path = (slug: string) => `/public/wards/${encodeURIComponent(slug)}`;

export function getPublicWard(slug: string): Promise<PublicWardProfile> {
  return apiRequest(path(slug), { retryOn401: false });
}

export function startPublicWardConversation(slug: string): Promise<StartedPublicWardConversation> {
  return apiRequest(`${path(slug)}/conversations`, {
    method: 'POST',
    retryOn401: false,
  });
}

export function resumePublicWardConversation(
  slug: string,
  conversationId: string,
  accessToken: string,
): Promise<PublicWardConversation> {
  return apiRequest(`${path(slug)}/conversations/${encodeURIComponent(conversationId)}`, {
    headers: { 'x-ward-token': accessToken },
    retryOn401: false,
  });
}

export function sendPublicWardMessage(
  slug: string,
  conversationId: string,
  accessToken: string,
  content: string,
): Promise<WardMessageResult> {
  return apiRequest(`${path(slug)}/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    headers: { 'x-ward-token': accessToken },
    retryOn401: false,
    body: { content },
  });
}

export function createPublicWardHandoff(
  slug: string,
  conversationId: string,
  accessToken: string,
  handoff: CreatePublicWardHandoff,
): Promise<PublicWardHandoff> {
  return apiRequest(`${path(slug)}/conversations/${encodeURIComponent(conversationId)}/handoff`, {
    method: 'POST',
    headers: { 'x-ward-token': accessToken },
    retryOn401: false,
    body: handoff,
  });
}

export function deletePublicWardHandoff(
  slug: string,
  conversationId: string,
  accessToken: string,
): Promise<{ deleted: true }> {
  return apiRequest(`${path(slug)}/conversations/${encodeURIComponent(conversationId)}/handoff`, {
    method: 'DELETE',
    headers: { 'x-ward-token': accessToken },
    retryOn401: false,
  });
}
