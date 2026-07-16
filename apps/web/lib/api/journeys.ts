import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/journeys/dto/*` exactly (FPB-009 §8).
 * A Journey belongs to exactly one Goal (`POST /journeys` returns 409 for
 * a second Journey on the same Goal) — there is no single member-wide
 * "journey."
 */
export type JourneyStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface JourneyDto {
  id: string;
  title: string;
  status: JourneyStatus;
  goalId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function createJourney(accessToken: string, goalId: string, title: string): Promise<JourneyDto> {
  return apiRequest<JourneyDto>('/journeys', { method: 'POST', accessToken, body: { goalId, title } });
}

export function getJourneyByGoal(accessToken: string, goalId: string): Promise<JourneyDto> {
  return apiRequest<JourneyDto>(`/journeys/by-goal/${goalId}`, { accessToken });
}

export function getJourney(accessToken: string, id: string): Promise<JourneyDto> {
  return apiRequest<JourneyDto>(`/journeys/${id}`, { accessToken });
}

export function updateJourney(accessToken: string, id: string, status: JourneyStatus): Promise<JourneyDto> {
  return apiRequest<JourneyDto>(`/journeys/${id}`, { method: 'PATCH', accessToken, body: { status } });
}
