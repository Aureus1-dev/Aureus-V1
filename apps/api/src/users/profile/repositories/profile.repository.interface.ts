import { Profile, SeasonOfLife } from '@prisma/client';

export const PROFILE_REPOSITORY = 'PROFILE_REPOSITORY';

// Pods matching fields (WO-030 Founder Decisions #7-#9) are optional,
// member-owned, editable, and purpose-bound — never required, never
// defaulted, and never inferred on the member's behalf.
export interface CreateProfileInput {
  userId: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  city?: string;
  region?: string;
  stateProvince?: string;
  country?: string;
  localAreaDescription?: string;
  profession?: string;
  seasonOfLife?: SeasonOfLife;
  availabilityNotes?: string;
  preferredLanguage?: string;
  faithPreference?: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  city?: string | null;
  region?: string | null;
  stateProvince?: string | null;
  country?: string | null;
  localAreaDescription?: string | null;
  profession?: string | null;
  seasonOfLife?: SeasonOfLife | null;
  availabilityNotes?: string | null;
  preferredLanguage?: string | null;
  faithPreference?: string | null;
}

export interface IProfileRepository {
  create(data: CreateProfileInput): Promise<Profile>;
  findByUserId(userId: string): Promise<Profile | null>;
  update(userId: string, data: UpdateProfileInput): Promise<Profile>;
  softDelete(userId: string): Promise<Profile>;
}
