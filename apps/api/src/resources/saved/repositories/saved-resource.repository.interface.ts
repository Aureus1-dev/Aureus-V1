import { SavedResource } from '@prisma/client';

export const SAVED_RESOURCE_REPOSITORY = 'SAVED_RESOURCE_REPOSITORY';

export interface CreateSavedResourceInput {
  userId: string;
  resourceId: string;
  isFavorite?: boolean;
  notes?: string;
}

export interface UpdateSavedResourceInput {
  isFavorite?: boolean;
  notes?: string;
}

export interface ISavedResourceRepository {
  save(data: CreateSavedResourceInput): Promise<SavedResource>;
  findByUser(userId: string): Promise<SavedResource[]>;
  findOne(userId: string, resourceId: string): Promise<SavedResource | null>;
  update(userId: string, resourceId: string, data: UpdateSavedResourceInput): Promise<SavedResource>;
  remove(userId: string, resourceId: string): Promise<void>;
}
