import { StewardshipEscalation, StewardshipEscalationSeverity, StewardshipEscalationStatus } from '@prisma/client';

export const STEWARDSHIP_ESCALATION_REPOSITORY = 'STEWARDSHIP_ESCALATION_REPOSITORY';

// Exactly one of relationshipId/podId is set, enforced by the calling
// service — mirrors StewardshipRecommendation's real-nullable-FK-per-target
// shape (WO-030 Founder Decision #4).
export interface CreateEscalationInput {
  relationshipId?: string;
  podId?: string;
  title: string;
  description: string;
  severity?: StewardshipEscalationSeverity;
  raisedById: string;
}

export interface UpdateEscalationInput {
  status?: StewardshipEscalationStatus;
  severity?: StewardshipEscalationSeverity;
  resolvedById?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
}

export interface IStewardshipEscalationRepository {
  create(data: CreateEscalationInput): Promise<StewardshipEscalation>;
  findById(id: string): Promise<StewardshipEscalation | null>;
  findByRelationship(relationshipId: string): Promise<StewardshipEscalation[]>;
  findByPod(podId: string): Promise<StewardshipEscalation[]>;
  update(id: string, data: UpdateEscalationInput): Promise<StewardshipEscalation>;
  countByStewardAndStatus(stewardId: string, statuses: StewardshipEscalationStatus[]): Promise<number>;
}
