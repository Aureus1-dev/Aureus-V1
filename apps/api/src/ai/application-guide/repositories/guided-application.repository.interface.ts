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
  responsibilityId?: string | null;
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

  findOwnedById(
    id: string,
    userId: string,
  ): Promise<GuidedApplicationSession | null>;

  /**
   * Every mutating method below re-asserts { id, userId, status: ACTIVE } in
   * the write's own filter — not merely in a prior read — so a concurrent
   * end/consent/analysis race cannot mutate a session that is no longer this
   * caller's active one. Throws NotFoundException when that filter matches
   * nothing.
   */
  end(id: string, userId: string, endedAt: Date): Promise<GuidedApplicationSession>;

  setConsent(
    id: string,
    userId: string,
    granted: boolean,
    occurredAt: Date,
  ): Promise<GuidedApplicationSessionWithOpportunity>;

  markAnalyzed(id: string, userId: string, analyzedAt: Date): Promise<void>;
}

export { GuidedApplicationSessionStatus };
