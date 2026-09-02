import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ResponsibilityActorClass,
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityEvidenceLevel,
  ResponsibilityEventType,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  ResponsibilityStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAcceptedResponsibilityInput,
  IResponsibilityRepository,
  ResponsibilityEvidenceInput,
  ResponsibilityWithEvents,
} from './responsibility.repository.interface';

const EVENT_INCLUDE = {
  events: { orderBy: { occurredAt: 'asc' as const } },
};

const SUCCESS_CRITERIA: Prisma.InputJsonValue = {
  type: 'OPPORTUNITY_DECISION_RECORDED',
  evidenceSource: 'SavedOpportunity.trackingStatus',
  terminalTrackingStatuses: ['APPLYING', 'APPLIED', 'RECEIVED', 'NOT_INTERESTED'],
};

@Injectable()
export class PrismaResponsibilityRepository implements IResponsibilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOpenOpportunityDecision(
    principalUserId: string,
    opportunityId: string,
  ): Promise<ResponsibilityWithEvents | null> {
    return this.prisma.db.responsibility.findFirst({
      where: {
        contextType: ResponsibilityContextType.PERSONAL,
        kind: ResponsibilityKind.OPPORTUNITY_DECISION,
        principalUserId,
        originOpportunityId: opportunityId,
        status: {
          notIn: [
            ResponsibilityStatus.COMPLETED,
            ResponsibilityStatus.RESPONSIBLY_EXHAUSTED,
            ResponsibilityStatus.CANCELLED,
          ],
        },
      },
      include: EVENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAccepted(
    input: CreateAcceptedResponsibilityInput,
  ): Promise<ResponsibilityWithEvents> {
    const existing = await this.findOpenOpportunityDecision(
      input.principalUserId,
      input.originOpportunityId,
    );
    if (existing) return existing;

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const responsibility = await tx.responsibility.create({
          data: {
            kind: ResponsibilityKind.OPPORTUNITY_DECISION,
            objective: input.objective,
            status: ResponsibilityStatus.ACTIVE,
            contextType: ResponsibilityContextType.PERSONAL,
            principalUserId: input.principalUserId,
            principalOrganizationId: null,
            originConversationId: input.originConversationId,
            originOpportunityId: input.originOpportunityId,
            successCriteria: SUCCESS_CRITERIA,
            authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
            authorityPolicyVersion: 'responsibility-guidance-v1',
            privacyScope: ResponsibilityPrivacyScope.PERSONAL_PRIVATE,
            privacyPolicyVersion: 'personal-private-v1',
            retentionExpiresAt: null,
          },
        });

        // Give the two initial events distinct timestamps so the append-only
        // ledger has deterministic chronological order even on databases where
        // DEFAULT now() would give both rows the same millisecond.
        const acceptedAt = new Date();
        const commitmentAt = new Date(acceptedAt.getTime() + 1);
        await tx.responsibilityEvent.createMany({
          data: [
            {
              responsibilityId: responsibility.id,
              type: ResponsibilityEventType.ACCEPTED,
              actorClass: ResponsibilityActorClass.MEMBER,
              actorUserId: input.principalUserId,
              fromStatus: null,
              toStatus: ResponsibilityStatus.ACTIVE,
              occurredAt: acceptedAt,
            },
            {
              responsibilityId: responsibility.id,
              type: ResponsibilityEventType.COMMITMENT_RECORDED,
              actorClass: ResponsibilityActorClass.AUREUS,
              actorUserId: null,
              fromStatus: null,
              toStatus: null,
              occurredAt: commitmentAt,
            },
          ],
        });

        return tx.responsibility.findUniqueOrThrow({
          where: { id: responsibility.id },
          include: EVENT_INCLUDE,
        });
      });
    } catch (error) {
      // The migration includes a partial unique index for one open personal
      // Opportunity Decision per member/opportunity. If two requests race,
      // the loser returns the durable commitment created by the winner.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = await this.findOpenOpportunityDecision(
          input.principalUserId,
          input.originOpportunityId,
        );
        if (winner) return winner;
      }
      throw error;
    }
  }

  findPersonalById(
    id: string,
    principalUserId: string,
  ): Promise<ResponsibilityWithEvents | null> {
    return this.prisma.db.responsibility.findFirst({
      where: {
        id,
        contextType: ResponsibilityContextType.PERSONAL,
        principalUserId,
      },
      include: EVENT_INCLUDE,
    });
  }

  findPersonalByUser(
    principalUserId: string,
  ): Promise<ResponsibilityWithEvents[]> {
    return this.prisma.db.responsibility.findMany({
      where: {
        contextType: ResponsibilityContextType.PERSONAL,
        principalUserId,
      },
      include: EVENT_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async markWaitingOnUser(
    id: string,
    principalUserId: string,
  ): Promise<ResponsibilityWithEvents> {
    return this.prisma.db.$transaction(async (tx) => {
      const current = await tx.responsibility.findFirst({
        where: {
          id,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId,
        },
        include: EVENT_INCLUDE,
      });
      if (!current) throw new NotFoundException('Responsibility not found');

      if (
        current.status === ResponsibilityStatus.WAITING_ON_USER ||
        current.status === ResponsibilityStatus.COMPLETED
      ) {
        return current;
      }

      const { count } = await tx.responsibility.updateMany({
        where: {
          id,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId,
          status: ResponsibilityStatus.ACTIVE,
        },
        data: { status: ResponsibilityStatus.WAITING_ON_USER },
      });

      if (count === 1) {
        await tx.responsibilityEvent.create({
          data: {
            responsibilityId: id,
            type: ResponsibilityEventType.USER_INPUT_REQUIRED,
            actorClass: ResponsibilityActorClass.AUREUS,
            actorUserId: null,
            fromStatus: ResponsibilityStatus.ACTIVE,
            toStatus: ResponsibilityStatus.WAITING_ON_USER,
          },
        });
      }

      return tx.responsibility.findFirstOrThrow({
        where: {
          id,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId,
        },
        include: EVENT_INCLUDE,
      });
    });
  }

  async completeWithEvidence(
    id: string,
    principalUserId: string,
    evidence: ResponsibilityEvidenceInput,
  ): Promise<ResponsibilityWithEvents> {
    return this.prisma.db.$transaction(async (tx) => {
      const current = await tx.responsibility.findFirst({
        where: {
          id,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId,
        },
        include: EVENT_INCLUDE,
      });
      if (!current) throw new NotFoundException('Responsibility not found');
      if (current.status === ResponsibilityStatus.COMPLETED) return current;

      const completedAt = new Date();
      const { count } = await tx.responsibility.updateMany({
        where: {
          id,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId,
          status: {
            in: [
              ResponsibilityStatus.ACTIVE,
              ResponsibilityStatus.WAITING_ON_USER,
            ],
          },
        },
        data: {
          status: ResponsibilityStatus.COMPLETED,
          completedAt,
        },
      });

      if (count === 1) {
        await tx.responsibilityEvent.createMany({
          data: [
            {
              responsibilityId: id,
              type: ResponsibilityEventType.ACTION_EVIDENCED,
              actorClass: ResponsibilityActorClass.SYSTEM,
              actorUserId: null,
              fromStatus: null,
              toStatus: null,
              ...evidence,
            },
            {
              responsibilityId: id,
              type: ResponsibilityEventType.COMPLETED,
              actorClass: ResponsibilityActorClass.SYSTEM,
              actorUserId: null,
              fromStatus: current.status,
              toStatus: ResponsibilityStatus.COMPLETED,
              ...evidence,
            },
          ],
        });
      }

      return tx.responsibility.findFirstOrThrow({
        where: {
          id,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId,
        },
        include: EVENT_INCLUDE,
      });
    });
  }
}

export { ResponsibilityEvidenceLevel };
