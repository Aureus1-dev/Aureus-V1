import { apiRequest } from './http';
import { ApiError } from './errors';

/**
 * DTO mirrors `apps/api/src/users/profile/dto/profile-response.dto.ts`
 * exactly (FPB-009 §8). Home only ever reads its own profile for the
 * greeting — this client does not implement create/update/delete,
 * since editing Profile remains out of this Domain's scope.
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
