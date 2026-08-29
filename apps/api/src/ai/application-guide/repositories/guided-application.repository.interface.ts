import {
  GuidedApplicationSession,
  GuidedApplicationSessionStatus,
  Opportunity,
} from '@prisma/client';

export const GUIDED_APPLICATION_REPOSITORY = 'GUIDED_APPLICATION_REPOSITORY';

export type GuidedApplicationSessionWithOpportunity =
  GuidedApplicationSession & { opportunity: Opportunity };

export interface CreateGuidedApplicationSessionInput {
  userId: string;
  conversationId: string;
  opportunityId: string;
  applicationUrl: string;
}

export interface IGuidedApplicationRepository {
  create(
    data: CreateGuidedApplicationSessionInput,
  ): Promise<GuidedApplicationSession>;

  findActiveByConversation(
    userId: string,
    conversationId: string,
  ): Promise<GuidedApplicationSessionWithOpportunity | null>;

  findOwnedActiveById(
    id: string,
    userId: string,
  ): Promise<GuidedApplicationSession | null>;

  end(id: string, endedAt: Date): Promise<GuidedApplicationSession>;

  setConsent(
    id: string,
    granted: boolean,
    occurredAt: Date,
  ): Promise<GuidedApplicationSessionWithOpportunity>;

  markAnalyzed(id: string, analyzedAt: Date): Promise<void>;
}

export { GuidedApplicationSessionStatus };
