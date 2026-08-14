import { apiRequest } from './http';

export type WardConversationStatus =
  | 'OPEN'
  | 'ESCALATION_OFFERED'
  | 'ESCALATED'
  | 'CLOSED'
  | 'EXPIRED';

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
  notice: string;
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
