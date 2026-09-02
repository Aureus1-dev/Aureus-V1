import { apiRequest } from './http';

export interface GuidedApplicationSessionDto {
  id: string;
  conversationId: string;
  opportunityId: string;
  responsibilityId: string | null;
  opportunityTitle: string;
  provider: string;
  applicationUrl: string;
  status: 'ACTIVE' | 'ENDED';
  screenCaptureConsentGrantedAt: string | null;
  screenCaptureConsentRevokedAt: string | null;
  lastFrameAnalyzedAt: string | null;
}

export interface GuidedApplicationFieldGuidanceDto {
  label: string;
  guidance: string;
  sensitivity: 'NORMAL' | 'MEMBER_CONTROL';
  memberControlReason: string | null;
}

export interface GuidedApplicationAnalysisDto {
  pageSummary: string;
  nextStep: string;
  fields: GuidedApplicationFieldGuidanceDto[];
  warnings: string[];
  imagePersisted: false;
  analyzedAt: string;
}

export function startGuidedApplicationSession(
  accessToken: string,
  conversationId: string,
  opportunityId: string,
): Promise<GuidedApplicationSessionDto> {
  return apiRequest<GuidedApplicationSessionDto>('/ai/application-guide/sessions', {
    method: 'POST',
    accessToken,
    body: { conversationId, opportunityId },
    timeoutMs: 20_000,
  });
}

export function getActiveGuidedApplicationSession(
  accessToken: string,
  conversationId: string,
): Promise<GuidedApplicationSessionDto | null> {
  const query = new URLSearchParams({ conversationId });
  return apiRequest<GuidedApplicationSessionDto | null>(
    `/ai/application-guide/sessions/active?${query.toString()}`,
    { accessToken, timeoutMs: 20_000 },
  );
}

export function setGuidedApplicationConsent(
  accessToken: string,
  sessionId: string,
  granted: boolean,
): Promise<GuidedApplicationSessionDto> {
  return apiRequest<GuidedApplicationSessionDto>(
    `/ai/application-guide/sessions/${sessionId}/consent`,
    {
      method: 'POST',
      accessToken,
      body: { granted },
      timeoutMs: 20_000,
    },
  );
}

export function analyzeGuidedApplicationFrame(
  accessToken: string,
  sessionId: string,
  input: {
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
    imageBase64: string;
    pageHint?: string;
  },
): Promise<GuidedApplicationAnalysisDto> {
  return apiRequest<GuidedApplicationAnalysisDto>(
    `/ai/application-guide/sessions/${sessionId}/analyze`,
    {
      method: 'POST',
      accessToken,
      body: input,
      timeoutMs: 45_000,
    },
  );
}

export function endGuidedApplicationSession(
  accessToken: string,
  sessionId: string,
): Promise<{ ended: true }> {
  return apiRequest<{ ended: true }>(
    `/ai/application-guide/sessions/${sessionId}/end`,
    {
      method: 'POST',
      accessToken,
      timeoutMs: 20_000,
    },
  );
}
