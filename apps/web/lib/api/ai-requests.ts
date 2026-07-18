import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/ai/requests/dto/*` exactly (FPB-009 §8).
 * Platform-wide audit log + spend summary — Platform/System Administrator
 * only (PR-003 AI Operational Controls panel). Member-facing "my AI usage"
 * history has no frontend surface yet and is a documented future extension.
 */
export type AiCapability =
  | 'QUESTION_ANSWERING' | 'RECOMMENDATION' | 'OPPORTUNITY_EXPLANATION' | 'RESOURCE_EXPLANATION'
  | 'JOURNEY_GUIDANCE' | 'ACADEMY_GUIDANCE' | 'KNOWLEDGE_SEARCH' | 'POD_INSIGHT'
  | 'VOICE_CONVERSATION' | 'DOCUMENT_SUMMARY';

export type AiRequestStatus = 'SUCCESS' | 'FAILED';

export interface AiRequestDto {
  id: string;
  userId: string;
  conversationId: string | null;
  capability: AiCapability;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
  status: AiRequestStatus;
  errorMessage: string | null;
  createdAt: string;
}

export interface PaginatedAiRequestsDto {
  data: AiRequestDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AiSpendSummaryDto {
  totalCostUsd: number;
  requestCount: number;
  failedCount: number;
  globalDailyBudgetUsd: number;
  emergencyStop: boolean;
}

export interface ListAiRequestsParams {
  page?: number;
  limit?: number;
  capability?: AiCapability;
  status?: AiRequestStatus;
  userId?: string;
}

export function listAllAiRequests(accessToken: string, params: ListAiRequestsParams = {}): Promise<PaginatedAiRequestsDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.capability) query.set('capability', params.capability);
  if (params.status) query.set('status', params.status);
  if (params.userId) query.set('userId', params.userId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedAiRequestsDto>(`/ai/requests${suffix}`, { accessToken });
}

export function getAiSpendSummary(accessToken: string): Promise<AiSpendSummaryDto> {
  return apiRequest<AiSpendSummaryDto>('/ai/requests/summary', { accessToken });
}
