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
  /** Omitted for the platform-wide admin listing (PR-003) — scoped for every other caller. */
  userId?: string;
  capability?: AiCapability;
  status?: AiRequestStatus;
}

export interface PaginatedAiRequests {
  data: AiRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface AiSpendSummary {
  totalCostUsd: number;
  requestCount: number;
  failedCount: number;
}

export interface AiCapabilitySpendSummary extends AiSpendSummary {
  capability: AiCapability;
}

export interface IAiRequestRepository {
  create(data: CreateAiRequestInput): Promise<AiRequest>;
  findById(id: string): Promise<AiRequest | null>;
  findAll(params: AiRequestQueryParams): Promise<PaginatedAiRequests>;

  /**
   * Sum of costUsd across successful requests created at or after `since`,
   * optionally scoped to one user. Backs the AI spend ceilings (PR-002).
   */
  sumCostSince(since: Date, userId?: string): Promise<number>;

  /**
   * Cost, request count, and failure count since `since`, optionally scoped
   * to one user — backs the Founder Operating System's AI spend summary
   * tile (PR-003). A richer sibling of `sumCostSince`, not a replacement:
   * the spend-ceiling hot path only ever needs the one number.
   */
  summarySince(since: Date, userId?: string): Promise<AiSpendSummary>;

  /**
   * Cost, request count, and failure count since `since`, grouped by
   * capability — backs the AI Orchestrator's Founder-visible spend-by-
   * capability view (PR-004). An additive sibling of `summarySince`, not a
   * replacement: the existing platform-wide-total contract is unchanged.
   */
  groupedByCapabilitySince(since: Date): Promise<AiCapabilitySpendSummary[]>;
}
