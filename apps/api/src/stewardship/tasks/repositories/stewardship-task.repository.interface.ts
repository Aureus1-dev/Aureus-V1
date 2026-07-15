import { StewardshipTask, StewardshipTaskStatus } from '@prisma/client';

export const STEWARDSHIP_TASK_REPOSITORY = 'STEWARDSHIP_TASK_REPOSITORY';

export interface CreateStewardshipTaskInput {
  relationshipId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  createdById: string;
  status?: StewardshipTaskStatus;
}

export interface UpdateStewardshipTaskInput {
  title?: string;
  description?: string | null;
  status?: StewardshipTaskStatus;
  dueDate?: Date | null;
}

export interface IStewardshipTaskRepository {
  create(data: CreateStewardshipTaskInput): Promise<StewardshipTask>;
  findById(id: string): Promise<StewardshipTask | null>;
  findByRelationship(relationshipId: string): Promise<StewardshipTask[]>;
  update(id: string, data: UpdateStewardshipTaskInput): Promise<StewardshipTask>;
  countByStewardAndStatus(stewardId: string, status: StewardshipTaskStatus): Promise<number>;
}
