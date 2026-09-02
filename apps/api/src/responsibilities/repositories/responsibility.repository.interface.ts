import {
  Responsibility,
  ResponsibilityActorClass,
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityEvent,
  ResponsibilityEvidenceLevel,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  ResponsibilityStatus,
} from '@prisma/client';

export const RESPONSIBILITY_REPOSITORY = 'RESPONSIBILITY_REPOSITORY';

export type ResponsibilityWithEvents = Responsibility & {
  events: ResponsibilityEvent[];
};

export interface CreateAcceptedResponsibilityInput {
  principalUserId: string;
  objective: string;
  originConversationId: string;
  originOpportunityId: string;
}

export interface ResponsibilityEvidenceInput {
  sourceSystem: string;
  sourceRecordType: string;
  sourceRecordId: string;
  sourceState: string;
  evidenceLevel: ResponsibilityEvidenceLevel;
}

export interface IResponsibilityRepository {
  findOpenOpportunityDecision(
    principalUserId: string,
    opportunityId: string,
  ): Promise<ResponsibilityWithEvents | null>;

  createAccepted(
    input: CreateAcceptedResponsibilityInput,
  ): Promise<ResponsibilityWithEvents>;

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

  completeWithEvidence(
    id: string,
    principalUserId: string,
    evidence: ResponsibilityEvidenceInput,
  ): Promise<ResponsibilityWithEvents>;
}

export {
  Responsibility,
  ResponsibilityActorClass,
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityEvent,
  ResponsibilityEvidenceLevel,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  ResponsibilityStatus,
};
