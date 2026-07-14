import { Profile } from '@prisma/client';

export const PROFILE_REPOSITORY = 'PROFILE_REPOSITORY';

export interface CreateProfileInput {
  userId: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface IProfileRepository {
  create(data: CreateProfileInput): Promise<Profile>;
  findByUserId(userId: string): Promise<Profile | null>;
  update(userId: string, data: UpdateProfileInput): Promise<Profile>;
  softDelete(userId: string): Promise<Profile>;
}
