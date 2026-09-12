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

const NON_TERMINAL_STATUSES: ResponsibilityStatus[] = [
  ResponsibilityStatus.ACTIVE,
  ResponsibilityStatus.WAITING_ON_AUREUS,
  ResponsibilityStatus.WAITING_ON_USER,
  ResponsibilityStatus.WAITING_ON_THIRD_PARTY,
  ResponsibilityStatus.BLOCKED,
];

@Injectable()
export class PrismaResponsibilityRepository implements IResponsibilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOpenOpportunityResponsibility(
    principalUserId: string,
    opportunityId: string,
    kind: ResponsibilityKind,
  ): Promise<ResponsibilityWithEvents | null> {
    return this.prisma.db.responsibility.findFirst({
      where: {
        contextType: ResponsibilityContextType.PERSONAL,
        kind,
        principalUserId,
        originOpportunityId: opportunityId,
        status: { in: NON_TERMINAL_STATUSES },
      },
      include: EVENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOpenConversationResponsibility(
    principalUserId: string,
    conversationId: string,
    kind: ResponsibilityKind,
  ): Promise<ResponsibilityWithEvents | null> {
    return this.prisma.db.responsibility.findFirst({
      where: {
        contextType: ResponsibilityContextType.PERSONAL,
        kind,
        principalUserId,
        originConversationId: conversationId,
        status: { in: NON_TERMINAL_STATUSES },
      },
      include: EVENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAccepted(
    input: CreateAcceptedResponsibilityInput,
  ): Promise<ResponsibilityWithEvents> {
    const existing = input.originOpportunityId
      ? await this.findOpenOpportunityResponsibility(
          input.principalUserId,
          input.originOpportunityId,
          input.kind,
        )
      : await this.findOpenConversationResponsibility(
          input.principalUserId,
          input.originConversationId,
          input.kind,
        );
    if (existing) return existing;

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const responsibility = await tx.responsibility.create({
          data: {
            kind: input.kind,
            objective: input.objective,
            status: ResponsibilityStatus.ACTIVE,
            contextType: ResponsibilityContextType.PERSONAL,
            principalUserId: input.principalUserId,
            principalOrganizationId: null,
            originConversationId: input.originConversationId,
            originOpportunityId: input.originOpportunityId ?? null,
            successCriteria: input.successCriteria,
            authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
            authorityPolicyVersion: 'responsibility-guidance-v1',
            privacyScope: ResponsibilityPrivacyScope.PERSONAL_PRIVATE,
            privacyPolicyVersion: 'personal-private-v1',
            dueAt: input.dueAt ?? null,
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
      // Supported kinds use partial unique indexes for one open Responsibility
      // per member/source. If two requests race, return the durable commitment
      // created by the winner instead of surfacing a duplicate-key failure.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = input.originOpportunityId
          ? await this.findOpenOpportunityResponsibility(
              input.principalUserId,
              input.originOpportunityId,
              input.kind,
            )
          : await this.findOpenConversationResponsibility(
              input.principalUserId,
              input.originConversationId,
              input.kind,
            );
        if (winner) return winner;
      }
      throw error;
    }
  }

  findLatestPersonalByConversationKind(
    principalUserId: string,
    conversationId: string,
    kind: ResponsibilityKind,
  ): Promise<ResponsibilityWithEvents | null> {
    return this.prisma.db.responsibility.findFirst({
      where: {
        contextType: ResponsibilityContextType.PERSONAL,
        principalUserId,
        originConversationId: conversationId,
        kind,
      },
      include: EVENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
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
        current.status === ResponsibilityStatus.COMPLETED ||
        current.status === ResponsibilityStatus.RESPONSIBLY_EXHAUSTED ||
        current.status === ResponsibilityStatus.CANCELLED
      ) {
        return current;
      }

      const { count } = await tx.responsibility.updateMany({
        where: {
          id,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId,
          status: {
            in: [
              ResponsibilityStatus.ACTIVE,
              ResponsibilityStatus.WAITING_ON_AUREUS,
              ResponsibilityStatus.WAITING_ON_THIRD_PARTY,
              ResponsibilityStatus.BLOCKED,
            ],
          },
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
            fromStatus: current.status,
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

  async markWaitingOnThirdParty(
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
        current.status === ResponsibilityStatus.WAITING_ON_THIRD_PARTY ||
        current.status === ResponsibilityStatus.COMPLETED ||
        current.status === ResponsibilityStatus.RESPONSIBLY_EXHAUSTED ||
        current.status === ResponsibilityStatus.CANCELLED
      ) {
        return current;
      }

      const { count } = await tx.responsibility.updateMany({
        where: {
          id,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId,
          status: {
            in: [
              ResponsibilityStatus.ACTIVE,
              ResponsibilityStatus.WAITING_ON_AUREUS,
              ResponsibilityStatus.WAITING_ON_USER,
              ResponsibilityStatus.BLOCKED,
            ],
          },
        },
        data: { status: ResponsibilityStatus.WAITING_ON_THIRD_PARTY },
      });

      if (count === 1) {
        await tx.responsibilityEvent.create({
          data: {
            responsibilityId: id,
            type: ResponsibilityEventType.EXTERNAL_WAIT_STARTED,
            actorClass: ResponsibilityActorClass.AUREUS,
            actorUserId: null,
            fromStatus: current.status,
            toStatus: ResponsibilityStatus.WAITING_ON_THIRD_PARTY,
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

  async resumeFromWaitingOnUser(
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
        current.status === ResponsibilityStatus.ACTIVE ||
        current.status === ResponsibilityStatus.COMPLETED
      ) {
        return current;
      }
      if (current.status !== ResponsibilityStatus.WAITING_ON_USER) {
        return current;
      }

      const { count } = await tx.responsibility.updateMany({
        where: {
          id,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId,
          status: ResponsibilityStatus.WAITING_ON_USER,
        },
        data: { status: ResponsibilityStatus.ACTIVE },
      });

      if (count === 1) {
        await tx.responsibilityEvent.create({
          data: {
            responsibilityId: id,
            type: ResponsibilityEventType.STATE_CHANGED,
            actorClass: ResponsibilityActorClass.MEMBER,
            actorUserId: principalUserId,
            fromStatus: ResponsibilityStatus.WAITING_ON_USER,
            toStatus: ResponsibilityStatus.ACTIVE,
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

      const evidencedAt = new Date();
      const completedAt = new Date(evidencedAt.getTime() + 1);
      const { count } = await tx.responsibility.updateMany({
        where: {
          id,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId,
          status: {
            in: [
              ResponsibilityStatus.ACTIVE,
              ResponsibilityStatus.WAITING_ON_AUREUS,
              ResponsibilityStatus.WAITING_ON_USER,
              ResponsibilityStatus.WAITING_ON_THIRD_PARTY,
              ResponsibilityStatus.BLOCKED,
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
              occurredAt: evidencedAt,
              ...evidence,
            },
            {
              responsibilityId: id,
              type: ResponsibilityEventType.COMPLETED,
              actorClass: ResponsibilityActorClass.SYSTEM,
              actorUserId: null,
              fromStatus: current.status,
              toStatus: ResponsibilityStatus.COMPLETED,
              occurredAt: completedAt,
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

  async responsiblyExhaustWithEvidence(
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
      if (
        current.status === ResponsibilityStatus.RESPONSIBLY_EXHAUSTED ||
        current.status === ResponsibilityStatus.COMPLETED ||
        current.status === ResponsibilityStatus.CANCELLED
      ) {
        return current;
      }

      const evidencedAt = new Date();
      const exhaustedAt = new Date(evidencedAt.getTime() + 1);
      const { count } = await tx.responsibility.updateMany({
        where: {
          id,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId,
          status: { in: NON_TERMINAL_STATUSES },
        },
        data: { status: ResponsibilityStatus.RESPONSIBLY_EXHAUSTED },
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
              occurredAt: evidencedAt,
              ...evidence,
            },
            {
              responsibilityId: id,
              type: ResponsibilityEventType.RESPONSIBLY_EXHAUSTED,
              actorClass: ResponsibilityActorClass.SYSTEM,
              actorUserId: null,
              fromStatus: current.status,
              toStatus: ResponsibilityStatus.RESPONSIBLY_EXHAUSTED,
              occurredAt: exhaustedAt,
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
