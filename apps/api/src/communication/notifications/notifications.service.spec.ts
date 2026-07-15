import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeliveryChannel, DeliveryStatus, NotificationCategory, UserRole, UserStatus } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from './repositories/notification.repository.interface';
import {
  INotificationDeliveryRepository,
  NOTIFICATION_DELIVERY_REPOSITORY,
} from './repositories/notification-delivery.repository.interface';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from '../preferences/repositories/notification-preference.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../users/repositories/user.repository.interface';
import { IEmailService, EMAIL_SERVICE } from '../../email/email.service.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Notification, NotificationDelivery, NotificationPreference, User } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const OTHER: AuthenticatedUser = { id: 'other-001', email: 'o@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeNotification = (o: Partial<Notification> = {}): Notification => ({
  id: 'notif-001', recipientId: MEMBER.id, category: NotificationCategory.STEWARDSHIP, type: 'stewardship.relationship.activated',
  title: 'Steward assigned', body: 'You have been assigned a steward.', data: null, actorId: null, dedupeKey: null,
  readAt: null, archivedAt: null, expiresAt: null, createdAt: NOW, ...o,
});

const makeDelivery = (o: Partial<NotificationDelivery> = {}): NotificationDelivery => ({
  id: 'delivery-001', notificationId: 'notif-001', channel: DeliveryChannel.IN_APP, status: DeliveryStatus.DELIVERED,
  attempts: 0, lastAttemptAt: null, deliveredAt: NOW, failureReason: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeUser = (o: Partial<User> = {}): User => ({
  id: MEMBER.id, email: 'm@example.com', emailVerified: true, passwordHash: null, roles: [UserRole.MEMBER],
  status: UserStatus.ACTIVE, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<INotificationRepository> = {
  create: jest.fn(), findByDedupeKey: jest.fn(), findById: jest.fn(), findAll: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn(), archive: jest.fn(),
};
const mockDeliveryRepo: jest.Mocked<INotificationDeliveryRepository> = {
  create: jest.fn(), findByNotificationAndChannel: jest.fn(), findByNotification: jest.fn(), update: jest.fn(),
};
const mockPrefRepo: jest.Mocked<INotificationPreferenceRepository> = {
  findAllForUser: jest.fn(), findByUserAndCategory: jest.fn(), upsert: jest.fn(),
};
const mockUserRepo: jest.Mocked<IUserRepository> = {
  create: jest.fn(), findById: jest.fn(), findByEmail: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findAll: jest.fn(),
};
const mockEmailService: jest.Mocked<IEmailService> = {
  sendEmailVerification: jest.fn(), sendPasswordReset: jest.fn(), sendNotification: jest.fn(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NOTIFICATION_REPOSITORY, useValue: mockRepo },
        { provide: NOTIFICATION_DELIVERY_REPOSITORY, useValue: mockDeliveryRepo },
        { provide: NOTIFICATION_PREFERENCE_REPOSITORY, useValue: mockPrefRepo },
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        { provide: EMAIL_SERVICE, useValue: mockEmailService },
      ],
    }).compile();
    service = m.get(NotificationsService);
    jest.clearAllMocks();
  });

  describe('notify', () => {
    it('creates a notification with IN_APP DELIVERED and attempts EMAIL when preferences allow both channels', async () => {
      mockPrefRepo.findByUserAndCategory.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeNotification());
      mockDeliveryRepo.create.mockResolvedValue(makeDelivery());
      mockDeliveryRepo.findByNotificationAndChannel.mockResolvedValue(null);
      mockUserRepo.findById.mockResolvedValue(makeUser());
      mockDeliveryRepo.findByNotification.mockResolvedValue([
        makeDelivery({ channel: DeliveryChannel.IN_APP, status: DeliveryStatus.DELIVERED }),
        makeDelivery({ id: 'delivery-002', channel: DeliveryChannel.EMAIL, status: DeliveryStatus.SENT }),
      ]);

      const result = await service.notify({
        recipientId: MEMBER.id, category: NotificationCategory.STEWARDSHIP, type: 'stewardship.relationship.activated',
        title: 'Steward assigned', body: 'You have been assigned a steward.',
      });

      expect(result).not.toBeNull();
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockDeliveryRepo.create).toHaveBeenCalledWith(expect.objectContaining({ channel: DeliveryChannel.IN_APP, status: DeliveryStatus.DELIVERED }));
      expect(mockEmailService.sendNotification).toHaveBeenCalledWith('m@example.com', 'Steward assigned', 'You have been assigned a steward.');
    });

    it('is idempotent: a retried call with the same dedupeKey returns the existing notification without creating a duplicate', async () => {
      mockRepo.findByDedupeKey.mockResolvedValue(makeNotification({ dedupeKey: 'stewardship:rel-001' }));

      const result = await service.notify({
        recipientId: MEMBER.id, category: NotificationCategory.STEWARDSHIP, type: 'x', title: 't', body: 'b', dedupeKey: 'stewardship:rel-001',
      });

      expect(result?.id).toBe('notif-001');
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('returns null and creates nothing when the recipient has disabled the in-app channel for this category', async () => {
      mockPrefRepo.findByUserAndCategory.mockResolvedValue({
        id: 'pref-001', userId: MEMBER.id, category: NotificationCategory.ANNOUNCEMENT,
        inAppEnabled: false, emailEnabled: true, digestEnabled: false, quietHoursStart: null, quietHoursEnd: null,
        createdAt: NOW, updatedAt: NOW,
      } as NotificationPreference);

      const result = await service.notify({
        recipientId: MEMBER.id, category: NotificationCategory.ANNOUNCEMENT, type: 'announcement.published', title: 't', body: 'b',
      });

      expect(result).toBeNull();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('forces delivery for SYSTEM category even when the recipient has disabled the category (cannot be disabled)', async () => {
      mockPrefRepo.findByUserAndCategory.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeNotification({ category: NotificationCategory.SYSTEM }));
      mockDeliveryRepo.create.mockResolvedValue(makeDelivery());
      mockDeliveryRepo.findByNotificationAndChannel.mockResolvedValue(null);
      mockUserRepo.findById.mockResolvedValue(makeUser());
      mockDeliveryRepo.findByNotification.mockResolvedValue([]);

      const result = await service.notify({
        recipientId: MEMBER.id, category: NotificationCategory.SYSTEM, type: 'system.security-notice', title: 't', body: 'b',
      });

      expect(result).not.toBeNull();
      expect(mockPrefRepo.findByUserAndCategory).not.toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('skips email (SKIPPED delivery) when the recipient has disabled the email channel', async () => {
      mockPrefRepo.findByUserAndCategory.mockResolvedValue({
        id: 'pref-001', userId: MEMBER.id, category: NotificationCategory.STEWARDSHIP,
        inAppEnabled: true, emailEnabled: false, digestEnabled: false, quietHoursStart: null, quietHoursEnd: null,
        createdAt: NOW, updatedAt: NOW,
      } as NotificationPreference);
      mockRepo.create.mockResolvedValue(makeNotification());
      mockDeliveryRepo.create.mockResolvedValue(makeDelivery());
      mockDeliveryRepo.findByNotification.mockResolvedValue([]);

      await service.notify({ recipientId: MEMBER.id, category: NotificationCategory.STEWARDSHIP, type: 'x', title: 't', body: 'b' });

      expect(mockDeliveryRepo.create).toHaveBeenCalledWith(expect.objectContaining({ channel: DeliveryChannel.EMAIL, status: DeliveryStatus.SKIPPED }));
      expect(mockEmailService.sendNotification).not.toHaveBeenCalled();
    });

    it('records FAILED status with a reason when the email transport throws, without fabricating DELIVERED', async () => {
      mockPrefRepo.findByUserAndCategory.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeNotification());
      mockDeliveryRepo.create.mockImplementation(async (d) => makeDelivery({ channel: d.channel, status: d.status }));
      mockDeliveryRepo.findByNotificationAndChannel.mockResolvedValue(null);
      mockUserRepo.findById.mockResolvedValue(makeUser());
      mockEmailService.sendNotification.mockRejectedValue(new Error('SMTP timeout'));
      mockDeliveryRepo.findByNotification.mockResolvedValue([]);

      await service.notify({ recipientId: MEMBER.id, category: NotificationCategory.STEWARDSHIP, type: 'x', title: 't', body: 'b' });

      expect(mockDeliveryRepo.update).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        status: DeliveryStatus.FAILED, failureReason: 'SMTP timeout',
      }));
    });
  });

  describe('attemptEmailDelivery', () => {
    it('is a no-op once the channel has already reached SENT (idempotent retry)', async () => {
      mockDeliveryRepo.findByNotificationAndChannel.mockResolvedValue(makeDelivery({ channel: DeliveryChannel.EMAIL, status: DeliveryStatus.SENT }));

      await service.attemptEmailDelivery(makeNotification());

      expect(mockEmailService.sendNotification).not.toHaveBeenCalled();
      expect(mockDeliveryRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('allows the recipient to view their own notification', async () => {
      mockRepo.findById.mockResolvedValue(makeNotification());
      mockDeliveryRepo.findByNotification.mockResolvedValue([makeDelivery()]);
      const result = await service.findById('notif-001', MEMBER);
      expect(result.id).toBe('notif-001');
    });

    it('forbids a different user from viewing it', async () => {
      mockRepo.findById.mockResolvedValue(makeNotification());
      await expect(service.findById('notif-001', OTHER)).rejects.toThrow(ForbiddenException);
    });

    it('allows a Platform Administrator to view any notification', async () => {
      mockRepo.findById.mockResolvedValue(makeNotification());
      mockDeliveryRepo.findByNotification.mockResolvedValue([]);
      await expect(service.findById('notif-001', ADMIN)).resolves.toBeDefined();
    });

    it('throws NotFoundException for a missing notification', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('ghost', MEMBER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('markRead / markAllRead / archive', () => {
    it('marks a single notification read for its owner', async () => {
      mockRepo.findById.mockResolvedValue(makeNotification());
      mockRepo.markRead.mockResolvedValue(makeNotification({ readAt: NOW }));
      const result = await service.markRead('notif-001', MEMBER);
      expect(result.readAt).toEqual(NOW);
    });

    it('forbids marking another user\'s notification read', async () => {
      mockRepo.findById.mockResolvedValue(makeNotification());
      await expect(service.markRead('notif-001', OTHER)).rejects.toThrow(ForbiddenException);
    });

    it('marks all of the caller\'s unread notifications read and returns the count', async () => {
      mockRepo.markAllRead.mockResolvedValue(3);
      const result = await service.markAllRead(MEMBER);
      expect(result).toEqual({ count: 3 });
      expect(mockRepo.markAllRead).toHaveBeenCalledWith(MEMBER.id);
    });

    it('archives a notification for its owner', async () => {
      mockRepo.findById.mockResolvedValue(makeNotification());
      mockRepo.archive.mockResolvedValue(makeNotification({ archivedAt: NOW }));
      const result = await service.archive('notif-001', MEMBER);
      expect(result.archivedAt).toEqual(NOW);
    });
  });
});
