import { StewardshipEscalation, StewardshipEscalationSeverity, StewardshipEscalationStatus } from '@prisma/client';

export const STEWARDSHIP_ESCALATION_REPOSITORY = 'STEWARDSHIP_ESCALATION_REPOSITORY';

export interface CreateEscalationInput {
  relationshipId: string;
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
  update(id: string, data: UpdateEscalationInput): Promise<StewardshipEscalation>;
  countByStewardAndStatus(stewardId: string, statuses: StewardshipEscalationStatus[]): Promise<number>;
}
