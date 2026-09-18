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
  /**
   * People Step 4 operations queue source. Open work is the existing
   * NeedEscalation state machine; this deliberately does not create a second
   * ticket/case table.
   */
  findOpen(): Promise<NeedEscalation[]>;
  acknowledge(id: string, acknowledgedById: string): Promise<NeedEscalation>;
  resolve(id: string, resolvedById: string, resolutionNotes?: string): Promise<NeedEscalation>;
}
