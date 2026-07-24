import { NeedEscalation } from '@prisma/client';

export const NEED_ESCALATION_REPOSITORY = 'NEED_ESCALATION_REPOSITORY';

export interface CreateNeedEscalationInput {
  userId: string;
  statedNeedId: string;
  reason?: string;
}

export interface IStatedNeedEscalationRepository {
  create(data: CreateNeedEscalationInput): Promise<NeedEscalation>;
  findById(id: string): Promise<NeedEscalation | null>;
  findAllByStatedNeed(statedNeedId: string): Promise<NeedEscalation[]>;
  acknowledge(id: string, acknowledgedById: string): Promise<NeedEscalation>;
  resolve(id: string, resolvedById: string, resolutionNotes?: string): Promise<NeedEscalation>;
}
