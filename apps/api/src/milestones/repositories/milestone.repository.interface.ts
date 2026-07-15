import { Milestone, MilestoneStatus } from '@prisma/client';

export const MILESTONE_REPOSITORY = 'MILESTONE_REPOSITORY';

export interface CreateMilestoneInput {
  title: string;
  journeyId: string;
  status?: MilestoneStatus;
  position?: number;
}

export interface UpdateMilestoneInput {
  title?: string;
  status?: MilestoneStatus;
  position?: number;
}

export interface MilestonePaginationParams {
  page: number;
  limit: number;
  journeyId?: string;
  status?: MilestoneStatus;
}

export interface PaginatedMilestones {
  data: Milestone[];
  total: number;
  page: number;
  limit: number;
}

export interface IMilestoneRepository {
  create(data: CreateMilestoneInput): Promise<Milestone>;
  findById(id: string): Promise<Milestone | null>;
  findAll(params: MilestonePaginationParams): Promise<PaginatedMilestones>;
  update(id: string, data: UpdateMilestoneInput): Promise<Milestone>;
  softDelete(id: string): Promise<Milestone>;
  /** Resolves the owning user's ID via Journey → Goal. Null if the milestone does not exist. */
  findOwnerId(id: string): Promise<string | null>;
}
