import { apiRequest } from './http';

/**
 * Living Steward Workspace redesign — the right-hand context panel's
 * "Recent Memory" section. Mirrors
 * `apps/api/src/ai/memory/dto/institutional-memory-response.dto.ts`
 * exactly, which itself mirrors `InstitutionalMemoryContext`
 * (`institutional-memory.service.ts`) — a read-only bundle previously
 * used only to feed the AI Orchestrator's own prompts, now also readable
 * by the member it belongs to.
 */
export interface MemoryGoalDto {
  id: string;
  title: string;
  status: string;
}

export interface MemoryActiveJourneyDto {
  id: string;
  goalId: string;
  title: string;
  completedMilestones: number;
  totalMilestones: number;
}

export interface MemorySavedItemDto {
  id: string;
  title: string;
}

export interface MemoryPodMembershipDto {
  podId: string;
  podName: string;
  status: string;
}

export interface MemoryStewardshipRelationshipDto {
  id: string;
  stewardId: string | null;
  status: string;
}

export interface InstitutionalMemoryDto {
  goals: MemoryGoalDto[];
  activeJourney: MemoryActiveJourneyDto | null;
  savedOpportunities: MemorySavedItemDto[];
  savedResources: MemorySavedItemDto[];
  podMemberships: MemoryPodMembershipDto[];
  stewardshipRelationship: MemoryStewardshipRelationshipDto | null;
  recentConversationSnippets: string[];
}

/** The caller's own memory only — the endpoint takes no id, so there is nothing else to request. */
export function getMyMemory(accessToken: string): Promise<InstitutionalMemoryDto> {
  return apiRequest<InstitutionalMemoryDto>('/memory/me', { accessToken });
}
