import { apiRequest } from './http';

/**
 * DTO shapes mirror
 * `apps/api/src/ai/requests/dto/ai-operational-config-response.dto.ts` and
 * `update-ai-operational-config.dto.ts` exactly (FPB-009 §8). The Founder
 * Operating System's AI Operational Controls panel (PR-003) — live-editable,
 * takes effect on the next AI request with no restart required.
 */
export interface AiOperationalConfigDto {
  emergencyStop: boolean;
  globalDailyBudgetUsd: number;
  userDailyBudgetUsd: number;
  updatedById: string | null;
  updatedAt: string;
}

export interface UpdateAiOperationalConfigInput {
  emergencyStop?: boolean;
  globalDailyBudgetUsd?: number;
  userDailyBudgetUsd?: number;
}

export function getAiOperationalConfig(accessToken: string): Promise<AiOperationalConfigDto> {
  return apiRequest<AiOperationalConfigDto>('/ai/operational-config', { accessToken });
}

export function updateAiOperationalConfig(
  accessToken: string,
  input: UpdateAiOperationalConfigInput,
): Promise<AiOperationalConfigDto> {
  return apiRequest<AiOperationalConfigDto>('/ai/operational-config', { method: 'PATCH', accessToken, body: input });
}
