import { SavedOpportunity, TrackingStatus } from '@prisma/client';

export const SAVED_OPPORTUNITY_REPOSITORY = 'SAVED_OPPORTUNITY_REPOSITORY';

export interface CreateSavedInput {
  userId: string;
  opportunityId: string;
  isFavorite?: boolean;
  notes?: string;
}

export interface UpdateSavedInput {
  isFavorite?: boolean;
  trackingStatus?: TrackingStatus;
  notes?: string;
}

export interface ISavedOpportunityRepository {
  save(data: CreateSavedInput): Promise<SavedOpportunity>;
  findByUser(userId: string): Promise<SavedOpportunity[]>;
  findOne(userId: string, opportunityId: string): Promise<SavedOpportunity | null>;
  update(userId: string, opportunityId: string, data: UpdateSavedInput): Promise<SavedOpportunity>;
  remove(userId: string, opportunityId: string): Promise<void>;
}
