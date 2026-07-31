import { apiRequest } from './http';
import type { RecommendationDto } from './recommendations';
import type { MatchedResourceDto } from './needs';

/**
 * Member Arrival — Steward Experience migration. Mirrors
 * `apps/api/src/ai/orchestrator/dto/coordinated-plan-response.dto.ts`
 * exactly: never a search-results list, always exactly one Primary next
 * step plus zero-to-two genuinely useful Supporting steps, each still
 * carrying its own real, unmodified approval mechanism — a RECOMMENDATION
 * item decides via `lib/api/recommendations.ts` approve/dismiss, a
 * CITY_RESOURCE item via `lib/api/needs.ts` offer/respond.
 */
export type PlanItemSource = 'RECOMMENDATION' | 'CITY_RESOURCE';

export interface PlanItemDto {
  source: PlanItemSource;
  recommendation: RecommendationDto | null;
  cityResource: MatchedResourceDto | null;
  categoryLabel: string;
}

export interface CoordinatedPlanDto {
  primary: PlanItemDto;
  supporting: PlanItemDto[];
  combinedRationale: string;
  additionalPossibilitiesCount: number;
}

export type OrchestrationStatus = 'SUCCESS' | 'NO_ACTION' | 'FAILED';

/** Mirrors `apps/api/src/ai/orchestrator/dto/orchestration-run-response.dto.ts` exactly. */
export interface OrchestrationRunDto {
  id: string;
  userId: string;
  goal: string;
  capabilitiesInvoked: string[];
  outcome: string;
  status: OrchestrationStatus;
  latencyMs: number;
  createdAt: string;
}

/** Mirrors `apps/api/src/ai/orchestrator/dto/orchestrate-response.dto.ts`; only the `plan` shape is relevant here. */
export interface OrchestrateResponseDto {
  run: OrchestrationRunDto;
  plan?: CoordinatedPlanDto;
}

export function buildCoordinatedPlan(accessToken: string, needId?: string): Promise<OrchestrateResponseDto> {
  return apiRequest<OrchestrateResponseDto>('/ai/orchestrate', {
    method: 'POST',
    accessToken,
    body: needId ? { goal: 'COORDINATED_PLAN', needId } : { goal: 'COORDINATED_PLAN' },
  });
}
