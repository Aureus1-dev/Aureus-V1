import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { NotificationCategory, UserRole } from '@prisma/client';
import { NotificationPreferencesService } from './notification-preferences.service';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from './repositories/notification-preference.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { NotificationPreference } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const OTHER: AuthenticatedUser = { id: 'other-001', email: 'o@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makePref = (o: Partial<NotificationPreference> = {}): NotificationPreference => ({
  id: 'pref-001', userId: MEMBER.id, category: NotificationCategory.STEWARDSHIP,
  inAppEnabled: true, emailEnabled: true, digestEnabled: false, quietHoursStart: null, quietHoursEnd: null,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<INotificationPreferenceRepository> = {
  findAllForUser: jest.fn(), findByUserAndCategory: jest.fn(), upsert: jest.fn(),
};

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [NotificationPreferencesService, { provide: NOTIFICATION_PREFERENCE_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(NotificationPreferencesService);
    jest.clearAllMocks();
  });

  describe('findAllForUser', () => {
    it('returns one entry per category, defaulting untouched categories to both channels enabled', async () => {
      mockRepo.findAllForUser.mockResolvedValue([makePref({ category: NotificationCategory.STEWARDSHIP, emailEnabled: false })]);

      const result = await service.findAllForUser(MEMBER.id, MEMBER);

      expect(result).toHaveLength(Object.values(NotificationCategory).length);
      const stewardship = result.find((r) => r.category === NotificationCategory.STEWARDSHIP);
      expect(stewardship?.emailEnabled).toBe(false);
      const untouched = result.find((r) => r.category === NotificationCategory.SYSTEM);
      expect(untouched?.inAppEnabled).toBe(true);
      expect(untouched?.emailEnabled).toBe(true);
    });

    it('forbids a different member from viewing preferences', async () => {
      await expect(service.findAllForUser(MEMBER.id, OTHER)).rejects.toThrow(ForbiddenException);
    });

    it('allows a Platform Administrator to view another user\'s preferences', async () => {
      mockRepo.findAllForUser.mockResolvedValue([]);
      await expect(service.findAllForUser(MEMBER.id, ADMIN)).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    it('allows the user to disable email for a normal category', async () => {
      mockRepo.upsert.mockResolvedValue(makePref({ emailEnabled: false }));
      const result = await service.update(MEMBER.id, NotificationCategory.STEWARDSHIP, { emailEnabled: false }, MEMBER);
      expect(result.emailEnabled).toBe(false);
    });

    it('rejects disabling the in-app channel for SYSTEM notifications', async () => {
      await expect(service.update(MEMBER.id, NotificationCategory.SYSTEM, { inAppEnabled: false }, MEMBER))
        .rejects.toThrow(BadRequestException);
      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });

    it('allows disabling the email channel for SYSTEM notifications', async () => {
      mockRepo.upsert.mockResolvedValue(makePref({ category: NotificationCategory.SYSTEM, emailEnabled: false }));
      await expect(service.update(MEMBER.id, NotificationCategory.SYSTEM, { emailEnabled: false }, MEMBER)).resolves.toBeDefined();
    });

    it('forbids a different member from updating preferences', async () => {
      await expect(service.update(MEMBER.id, NotificationCategory.STEWARDSHIP, { emailEnabled: false }, OTHER))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
