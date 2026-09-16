import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationCategory,
  OrganizationMemberRole,
  ResponsibilityEventType,
  ResponsibilityEvidenceLevel,
} from '@prisma/client';
import { NotificationsService } from '../communication/notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ResponsibilityWithEvents } from './repositories/responsibility.repository.interface';

const MANAGEMENT_ROLES = [
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MANAGER,
];

type BusinessResponsibilityCommunication =
  'accepted' | 'needs_you' | 'completed_reported' | 'cancelled';

interface CommunicationCopy {
  title: string;
  body: string;
}

const COPY: Record<BusinessResponsibilityCommunication, CommunicationCopy> = {
  accepted: {
    title: 'Aureus accepted a business responsibility',
    body: 'Aureus recorded a new responsibility for this business.',
  },
  needs_you: {
    title: 'Aureus needs your help',
    body: 'A business responsibility is waiting for a current manager to respond.',
  },
  completed_reported: {
    title: 'Business responsibility reported complete',
    body: 'A current manager reported this responsibility complete. This is not independent verification.',
  },
  cancelled: {
    title: 'Business responsibility cancelled',
    body: 'A current manager cancelled this business responsibility.',
  },
};

/**
 * Publishes bounded, best-effort communication after a Responsibility
 * transaction has committed. ResponsibilityEvent remains the work ledger;
 * a notification can never create, complete, or verify the work itself.
 */
@Injectable()
export class BusinessResponsibilityCommunicationsService {
  private readonly logger = new Logger(BusinessResponsibilityCommunicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  accepted(responsibility: ResponsibilityWithEvents): Promise<void> {
    return this.publish('accepted', responsibility);
  }

  needsYou(responsibility: ResponsibilityWithEvents): Promise<void> {
    return this.publish('needs_you', responsibility);
  }

  completedReported(responsibility: ResponsibilityWithEvents): Promise<void> {
    return this.publish('completed_reported', responsibility);
  }

  cancelled(responsibility: ResponsibilityWithEvents): Promise<void> {
    return this.publish('cancelled', responsibility);
  }

  private async publish(
    communication: BusinessResponsibilityCommunication,
    responsibility: ResponsibilityWithEvents,
  ): Promise<void> {
    try {
      const organizationId = responsibility.principalOrganizationId;
      if (!organizationId) return;

      const recipients = await this.prisma.db.organizationMember.findMany({
        where: {
          organizationId,
          role: { in: MANAGEMENT_ROLES },
          organization: { deletedAt: null },
        },
        select: { userId: true },
      });

      const actorId = this.actorFor(communication, responsibility);
      if (
        communication === 'accepted' &&
        actorId &&
        recipients.some((recipient) => recipient.userId === actorId)
      ) {
        return;
      }

      const eligibleRecipients =
        communication === 'completed_reported' || communication === 'cancelled'
          ? recipients.filter((recipient) => recipient.userId !== actorId)
          : recipients;

      const evidenceLevel =
        communication === 'completed_reported' ? ResponsibilityEvidenceLevel.REPORTED : undefined;
      const copy = COPY[communication];
      const results = await Promise.allSettled(
        eligibleRecipients.map(({ userId }) =>
          this.notifications.notify({
            recipientId: userId,
            category: NotificationCategory.STEWARDSHIP,
            type: `business.responsibility.${communication}`,
            title: copy.title,
            body: copy.body,
            data: {
              organizationId,
              responsibilityId: responsibility.id,
              status: responsibility.status,
              ...(evidenceLevel ? { evidenceLevel } : {}),
            },
            actorId: actorId ?? undefined,
            dedupeKey: `business-responsibility:${responsibility.id}:${communication}`,
          }),
        ),
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.warn(
            `Business responsibility notification failed after commit: ${
              result.reason instanceof Error ? result.reason.message : 'unknown error'
            }`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Business responsibility communication could not be prepared after commit: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private actorFor(
    communication: BusinessResponsibilityCommunication,
    responsibility: ResponsibilityWithEvents,
  ): string | null {
    if (communication === 'accepted') {
      return (
        responsibility.events.find((event) => event.type === ResponsibilityEventType.ACCEPTED)
          ?.actorUserId ?? null
      );
    }
    if (communication === 'completed_reported') {
      return (
        responsibility.events.find((event) => event.type === ResponsibilityEventType.COMPLETED)
          ?.sourceRecordId ?? null
      );
    }
    if (communication === 'cancelled') {
      return (
        responsibility.events.find((event) => event.type === ResponsibilityEventType.CANCELLED)
          ?.actorUserId ?? null
      );
    }
    return null;
  }
}
