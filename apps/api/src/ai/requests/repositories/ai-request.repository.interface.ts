import { AiCapability, AiProvider, AiRequest, AiRequestStatus } from '@prisma/client';

export const AI_REQUEST_REPOSITORY = 'AI_REQUEST_REPOSITORY';

export interface CreateAiRequestInput {
  userId: string;
  conversationId?: string;
  capability: AiCapability;
  provider: AiProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
  status: AiRequestStatus;
  errorMessage?: string;
}

export interface AiRequestQueryParams {
  page: number;
  limit: number;
  userId: string;
  capability?: AiCapability;
}

export interface PaginatedAiRequests {
  data: AiRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface IAiRequestRepository {
  create(data: CreateAiRequestInput): Promise<AiRequest>;
  findById(id: string): Promise<AiRequest | null>;
  findAll(params: AiRequestQueryParams): Promise<PaginatedAiRequests>;
}
