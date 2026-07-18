import { apiRequest } from './http';
import { ApiError } from './errors';

/**
 * DTO mirrors `apps/api/src/users/profile/dto/profile-response.dto.ts`
 * exactly (FPB-009 §8).
 */
export interface ProfileDto {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  city: string | null;
  region: string | null;
  stateProvince: string | null;
  country: string | null;
  localAreaDescription: string | null;
  profession: string | null;
  seasonOfLife: string | null;
  availabilityNotes: string | null;
  preferredLanguage: string | null;
  faithPreference: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Mirrors `apps/api/src/users/profile/dto/update-profile.dto.ts` — every field optional and member-owned (WO-030 Founder Decisions #7-#9). */
export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  city?: string;
  region?: string;
  stateProvince?: string;
  country?: string;
  localAreaDescription?: string;
  profession?: string;
  seasonOfLife?: string;
  availabilityNotes?: string;
  preferredLanguage?: string;
  faithPreference?: string;
}

/**
 * Returns `null` rather than throwing when the member has no Profile
 * record yet (backend 404) — a missing profile is an expected, common
 * state (Profile creation is a separate opt-in step), not an error.
 */
export async function getMyProfile(accessToken: string, userId: string): Promise<ProfileDto | null> {
  try {
    return await apiRequest<ProfileDto>(`/users/${userId}/profile`, { accessToken });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export function createMyProfile(accessToken: string, userId: string, input: UpdateProfileInput): Promise<ProfileDto> {
  return apiRequest<ProfileDto>(`/users/${userId}/profile`, { method: 'POST', accessToken, body: input });
}

export function updateMyProfile(accessToken: string, userId: string, input: UpdateProfileInput): Promise<ProfileDto> {
  return apiRequest<ProfileDto>(`/users/${userId}/profile`, { method: 'PATCH', accessToken, body: input });
}
