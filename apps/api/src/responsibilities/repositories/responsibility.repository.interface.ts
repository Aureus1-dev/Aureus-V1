import {
  Prisma,
  Responsibility,
  ResponsibilityEvent,
  ResponsibilityEvidenceLevel,
  ResponsibilityKind,
} from '@prisma/client';

export const RESPONSIBILITY_REPOSITORY = 'RESPONSIBILITY_REPOSITORY';

export type ResponsibilityWithEvents = Responsibility & {
  events: ResponsibilityEvent[];
};

export interface CreateAcceptedResponsibilityInput {
  principalUserId: string;
  kind: ResponsibilityKind;
  objective: string;
  originConversationId: string;
  originOpportunityId: string;
  successCriteria: Prisma.InputJsonValue;
}

export interface ResponsibilityEvidenceInput {
  sourceSystem: string;
  sourceRecordType: string;
  sourceRecordId: string;
  sourceState: string;
  evidenceLevel: ResponsibilityEvidenceLevel;
}

export interface IResponsibilityRepository {
  findOpenOpportunityResponsibility(
    principalUserId: string,
    opportunityId: string,
    kind: ResponsibilityKind,
  ): Promise<ResponsibilityWithEvents | null>;

  createAccepted(
    input: CreateAcceptedResponsibilityInput,
  ): Promise<ResponsibilityWithEvents>;

  findLatestPersonalByConversationKind(
    principalUserId: string,
    conversationId: string,
    kind: ResponsibilityKind,
  ): Promise<ResponsibilityWithEvents | null>;

  findPersonalById(
    id: string,
    principalUserId: string,
  ): Promise<ResponsibilityWithEvents | null>;

  findPersonalByUser(
    principalUserId: string,
  ): Promise<ResponsibilityWithEvents[]>;

  markWaitingOnUser(
    id: string,
    principalUserId: string,
  ): Promise<ResponsibilityWithEvents>;

  resumeFromWaitingOnUser(
    id: string,
    principalUserId: string,
  ): Promise<ResponsibilityWithEvents>;

  completeWithEvidence(
    id: string,
    principalUserId: string,
    evidence: ResponsibilityEvidenceInput,
  ): Promise<ResponsibilityWithEvents>;
}
