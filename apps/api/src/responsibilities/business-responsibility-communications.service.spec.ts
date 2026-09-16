import {
  NotificationCategory,
  OrganizationMemberRole,
  ResponsibilityActorClass,
  ResponsibilityEventType,
  ResponsibilityStatus,
} from '@prisma/client';
import { NotificationsService } from '../communication/notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessResponsibilityCommunicationsService } from './business-responsibility-communications.service';
import type { ResponsibilityWithEvents } from './repositories/responsibility.repository.interface';

const management = [{ userId: 'owner-id' }, { userId: 'admin-id' }, { userId: 'manager-id' }];

function responsibility(
  status: ResponsibilityStatus,
  event: Partial<ResponsibilityWithEvents['events'][number]>,
): ResponsibilityWithEvents {
  return {
    id: 'responsibility-id',
    principalOrganizationId: 'organization-id',
    status,
    events: [
      {
        id: 'event-id',
        responsibilityId: 'responsibility-id',
        type: ResponsibilityEventType.ACCEPTED,
        actorClass: ResponsibilityActorClass.MEMBER,
        actorUserId: null,
        fromStatus: null,
        toStatus: status,
        sourceSystem: null,
        sourceRecordType: null,
        sourceRecordId: null,
        sourceState: null,
        evidenceLevel: null,
        occurredAt: new Date('2026-09-13T00:00:00.000Z'),
        ...event,
      },
    ],
  } as ResponsibilityWithEvents;
}

describe('BusinessResponsibilityCommunicationsService', () => {
  const findMany = jest.fn();
  const notify = jest.fn();
  const prisma = {
    db: { organizationMember: { findMany } },
  } as unknown as PrismaService;
  const notifications = { notify } as unknown as NotificationsService;
  const service = new BusinessResponsibilityCommunicationsService(prisma, notifications);

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue(management);
    notify.mockResolvedValue(null);
  });

  it('routes needs-you only to current managers in the exact tenant', async () => {
    const row = responsibility(ResponsibilityStatus.WAITING_ON_USER, {
      type: ResponsibilityEventType.USER_INPUT_REQUIRED,
      actorClass: ResponsibilityActorClass.AUREUS,
    });

    await service.needsYou(row);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'organization-id',
        role: {
          in: [
            OrganizationMemberRole.OWNER,
            OrganizationMemberRole.ADMIN,
            OrganizationMemberRole.MANAGER,
          ],
        },
        organization: { deletedAt: null },
      },
      select: { userId: true },
    });
    expect(notify).toHaveBeenCalledTimes(3);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'owner-id',
        category: NotificationCategory.STEWARDSHIP,
        type: 'business.responsibility.needs_you',
        dedupeKey: 'business-responsibility:responsibility-id:needs_you',
        data: {
          organizationId: 'organization-id',
          responsibilityId: 'responsibility-id',
          status: ResponsibilityStatus.WAITING_ON_USER,
        },
      }),
    );
  });

  it('does not fan out accepted when the accepting actor is already a manager', async () => {
    const row = responsibility(ResponsibilityStatus.ACTIVE, {
      type: ResponsibilityEventType.ACCEPTED,
      actorUserId: 'manager-id',
    });

    await service.accepted(row);

    expect(notify).not.toHaveBeenCalled();
  });

  it('fans accepted work from an operator to managers without leaking work content', async () => {
    const row = responsibility(ResponsibilityStatus.ACTIVE, {
      type: ResponsibilityEventType.ACCEPTED,
      actorUserId: 'operator-id',
    });

    await service.accepted(row);

    expect(notify).toHaveBeenCalledTimes(3);
    for (const [input] of notify.mock.calls) {
      expect(input.type).toBe('business.responsibility.accepted');
      expect(Object.keys(input.data).sort()).toEqual([
        'organizationId',
        'responsibilityId',
        'status',
      ]);
    }
  });

  it('keeps reported completion reported and excludes the attesting manager', async () => {
    const row = responsibility(ResponsibilityStatus.COMPLETED, {
      type: ResponsibilityEventType.COMPLETED,
      actorClass: ResponsibilityActorClass.SYSTEM,
      sourceRecordId: 'manager-id',
    });

    await service.completedReported(row);

    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).not.toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'manager-id' }));
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'business.responsibility.completed_reported',
        actorId: 'manager-id',
        body: expect.stringContaining('not independent verification'),
        data: expect.objectContaining({ evidenceLevel: 'REPORTED' }),
      }),
    );
  });

  it('excludes the cancelling manager and reuses one deterministic key on retry', async () => {
    const row = responsibility(ResponsibilityStatus.CANCELLED, {
      type: ResponsibilityEventType.CANCELLED,
      actorUserId: 'owner-id',
    });

    await service.cancelled(row);
    await service.cancelled(row);

    expect(notify).toHaveBeenCalledTimes(4);
    expect(notify).not.toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'owner-id' }));
    expect(new Set(notify.mock.calls.map(([input]) => input.dedupeKey))).toEqual(
      new Set(['business-responsibility:responsibility-id:cancelled']),
    );
  });

  it('never lets communication failure rewrite a committed responsibility result', async () => {
    const row = responsibility(ResponsibilityStatus.WAITING_ON_USER, {
      type: ResponsibilityEventType.USER_INPUT_REQUIRED,
      actorClass: ResponsibilityActorClass.AUREUS,
    });
    notify
      .mockRejectedValueOnce(new Error('notification store unavailable'))
      .mockResolvedValue(null);

    await expect(service.needsYou(row)).resolves.toBeUndefined();

    findMany.mockRejectedValueOnce(new Error('membership read unavailable'));
    await expect(service.needsYou(row)).resolves.toBeUndefined();
  });
});
