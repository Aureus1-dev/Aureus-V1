import { randomUUID } from 'crypto';
import {
  AnnouncementScope, AnnouncementStatus, ConversationType, DeliveryChannel, DeliveryStatus, NotificationCategory,
  StewardshipRelationshipOrigin, StewardshipRelationshipStatus, UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaNotificationRepository } from './notifications/repositories/prisma-notification.repository';
import { PrismaNotificationDeliveryRepository } from './notifications/repositories/prisma-notification-delivery.repository';
import { PrismaNotificationPreferenceRepository } from './preferences/repositories/prisma-notification-preference.repository';
import { PrismaAnnouncementRepository } from './announcements/repositories/prisma-announcement.repository';
import { PrismaConversationRepository } from './messaging/repositories/prisma-conversation.repository';
import { PrismaMessageRepository } from './messaging/repositories/prisma-message.repository';

/**
 * Integration test: exercises the Communication System's Prisma repositories
 * against a real PostgreSQL database (no mocks) — verifying constraint
 * behavior a mocked unit test cannot: the [recipientId, dedupeKey] and
 * [notificationId, channel] unique constraints (idempotency), the
 * relationshipId unique constraint (one conversation per relationship), and
 * the Announcement audience OR-query.
 *
 * Requires DATABASE_URL to point at a reachable, migrated database.
 */
describe('Communication System — Prisma integration', () => {
  let prisma: PrismaService;
  let notificationRepo: PrismaNotificationRepository;
  let deliveryRepo: PrismaNotificationDeliveryRepository;
  let preferenceRepo: PrismaNotificationPreferenceRepository;
  let announcementRepo: PrismaAnnouncementRepository;
  let conversationRepo: PrismaConversationRepository;
  let messageRepo: PrismaMessageRepository;

  const emailMarker = `integration-comm-${randomUUID()}`;
  let memberId: string;
  let stewardId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    notificationRepo = new PrismaNotificationRepository(prisma);
    deliveryRepo = new PrismaNotificationDeliveryRepository(prisma);
    preferenceRepo = new PrismaNotificationPreferenceRepository(prisma);
    announcementRepo = new PrismaAnnouncementRepository(prisma);
    conversationRepo = new PrismaConversationRepository(prisma);
    messageRepo = new PrismaMessageRepository(prisma);

    const member = await prisma.db.user.create({
      data: { email: `member-${emailMarker}@example.test`, roles: [UserRole.MEMBER] },
    });
    const steward = await prisma.db.user.create({
      data: { email: `steward-${emailMarker}@example.test`, roles: [UserRole.STEWARD] },
    });
    memberId = member.id;
    stewardId = steward.id;
  });

  afterAll(async () => {
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await prisma.onModuleDestroy();
  });

  it('enforces the [recipientId, dedupeKey] unique constraint (notification idempotency)', async () => {
    const dedupeKey = `integration-test:${randomUUID()}`;
    await notificationRepo.create({
      recipientId: memberId, category: NotificationCategory.STEWARDSHIP, type: 'x', title: 't', body: 'b', dedupeKey,
    });

    await expect(
      notificationRepo.create({
        recipientId: memberId, category: NotificationCategory.STEWARDSHIP, type: 'x', title: 't2', body: 'b2', dedupeKey,
      }),
    ).rejects.toThrow();

    const found = await notificationRepo.findByDedupeKey(memberId, dedupeKey);
    expect(found?.title).toBe('t');
  });

  it('enforces the [notificationId, channel] unique constraint (delivery idempotency)', async () => {
    const notification = await notificationRepo.create({
      recipientId: memberId, category: NotificationCategory.SYSTEM, type: 'x', title: 't', body: 'b',
    });
    await deliveryRepo.create({ notificationId: notification.id, channel: DeliveryChannel.EMAIL, status: DeliveryStatus.PENDING });

    await expect(
      deliveryRepo.create({ notificationId: notification.id, channel: DeliveryChannel.EMAIL, status: DeliveryStatus.PENDING }),
    ).rejects.toThrow();
  });

  it('round-trips notification read/archive state and pagination', async () => {
    await notificationRepo.create({ recipientId: memberId, category: NotificationCategory.JOURNEY, type: 'a', title: 't1', body: 'b1' });
    const n2 = await notificationRepo.create({ recipientId: memberId, category: NotificationCategory.JOURNEY, type: 'b', title: 't2', body: 'b2' });

    const page1 = await notificationRepo.findAll({ page: 1, limit: 1, recipientId: memberId, category: NotificationCategory.JOURNEY });
    expect(page1.data).toHaveLength(1);
    expect(page1.total).toBeGreaterThanOrEqual(2);

    const read = await notificationRepo.markRead(n2.id);
    expect(read.readAt).not.toBeNull();

    const archived = await notificationRepo.archive(n2.id);
    expect(archived.archivedAt).not.toBeNull();
  });

  it('upserts a notification preference idempotently on [userId, category]', async () => {
    const first = await preferenceRepo.upsert(memberId, NotificationCategory.RESOURCE, { emailEnabled: false });
    expect(first.emailEnabled).toBe(false);

    const second = await preferenceRepo.upsert(memberId, NotificationCategory.RESOURCE, { inAppEnabled: false });
    expect(second.id).toBe(first.id);
    expect(second.inAppEnabled).toBe(false);
    expect(second.emailEnabled).toBe(false); // preserved from the first upsert
  });

  it('resolves PLATFORM and ROLE scoped announcements as visible to a matching user', async () => {
    const titleMarker = `INTEGRATION-ANN-${randomUUID()}`;
    await announcementRepo.create({ title: `${titleMarker}-platform`, body: 'b', scope: AnnouncementScope.PLATFORM, authorId: memberId });
    const roleAnn = await announcementRepo.create({
      title: `${titleMarker}-role`, body: 'b', scope: AnnouncementScope.ROLE, targetRole: UserRole.STEWARD, authorId: memberId,
    });
    await announcementRepo.updateStatus(roleAnn.id, AnnouncementStatus.PUBLISHED, { publishedAt: new Date() });
    const platformAnn = await prisma.db.announcement.findFirstOrThrow({ where: { title: `${titleMarker}-platform` } });
    await announcementRepo.updateStatus(platformAnn.id, AnnouncementStatus.PUBLISHED, { publishedAt: new Date() });

    const visible = await announcementRepo.findVisibleForUser({
      page: 1, limit: 50, organizationIds: [], roles: [UserRole.STEWARD], stewardIds: [],
    });
    const titles = visible.data.map((a) => a.title);
    expect(titles).toContain(`${titleMarker}-platform`);
    expect(titles).toContain(`${titleMarker}-role`);

    await prisma.db.announcement.deleteMany({ where: { title: { startsWith: titleMarker } } });
  });

  it('enforces one Conversation per StewardshipRelationship via the unique relationshipId constraint', async () => {
    const relationship = await prisma.db.stewardshipRelationship.create({
      data: {
        memberId, stewardId, status: StewardshipRelationshipStatus.ACTIVE,
        origin: StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT, activatedAt: new Date(),
      },
    });

    const created = await conversationRepo.create({
      type: ConversationType.STEWARDSHIP, relationshipId: relationship.id, participantIds: [memberId, stewardId],
    });
    expect(created.relationshipId).toBe(relationship.id);

    await expect(
      conversationRepo.create({ type: ConversationType.STEWARDSHIP, relationshipId: relationship.id, participantIds: [memberId, stewardId] }),
    ).rejects.toThrow();

    const found = await conversationRepo.findByRelationshipId(relationship.id);
    expect(found?.id).toBe(created.id);
    expect(await conversationRepo.isParticipant(created.id, memberId)).toBe(true);
    expect(await conversationRepo.isParticipant(created.id, randomUUID())).toBe(false);

    const message = await messageRepo.create({ conversationId: created.id, senderId: memberId, body: 'Hello steward' });
    expect(message.senderId).toBe(memberId);
    await conversationRepo.touchLastMessageAt(created.id, message.createdAt);

    const messages = await messageRepo.findByConversation(created.id, 1, 20);
    expect(messages.data).toHaveLength(1);

    await prisma.db.stewardshipRelationship.delete({ where: { id: relationship.id } });
  });
});
