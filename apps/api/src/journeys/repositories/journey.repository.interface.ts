import { Journey, JourneyStatus } from '@prisma/client';

export const JOURNEY_REPOSITORY = 'JOURNEY_REPOSITORY';

export interface CreateJourneyInput {
  title: string;
  goalId: string;
  status?: JourneyStatus;
}

export interface UpdateJourneyInput {
  title?: string;
  status?: JourneyStatus;
}

export interface IJourneyRepository {
  create(data: CreateJourneyInput): Promise<Journey>;
  findById(id: string): Promise<Journey | null>;
  findByGoalId(goalId: string): Promise<Journey | null>;
  update(id: string, data: UpdateJourneyInput): Promise<Journey>;
  softDelete(id: string): Promise<Journey>;
  /** Resolves the owning user's ID via the parent Goal. Null if the journey does not exist. */
  findOwnerId(id: string): Promise<string | null>;
}
