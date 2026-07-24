import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NeedEscalationStatus, UserRole } from '@prisma/client';
import type { NeedEscalation, PublishedOnCallHours, StatedNeed } from '@prisma/client';
import { NeedEscalationsService } from './need-escalations.service';
import { IStatedNeedRepository, STATED_NEED_REPOSITORY } from './repositories/stated-need.repository.interface';
import {
  IStatedNeedEscalationRepository,
  NEED_ESCALATION_REPOSITORY,
} from './repositories/need-escalation.repository.interface';
import { IOnCallHoursRepository, ON_CALL_HOURS_REPOSITORY } from './repositories/on-call-hours.repository.interface';
import { NotificationsService } from '../communication/notifications/notifications.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'user-001', email: 'member@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 'steward@example.com', roles: [UserRole.STEWARD] };

const makeNeed = (o: Partial<StatedNeed> = {}): StatedNeed => ({
  id: 'need-001', userId: 'user-001', conversationId: 'conv-001', content: 'I need help', createdAt: NOW, ...o,
});

const makeEscalation = (o: Partial<NeedEscalation> = {}): NeedEscalation => ({
  id: 'esc-001', userId: 'user-001', statedNeedId: 'need-001', reason: null,
  status: NeedEscalationStatus.PENDING, acknowledgedById: null, acknowledgedAt: null,
  resolvedById: null, resolutionNotes: null, resolvedAt: null, createdAt: NOW, ...o,
});

const makeOnCallHours = (o: Partial<PublishedOnCallHours> = {}): PublishedOnCallHours => ({
  id: 'singleton', hoursDescription: null, updatedById: null, updatedAt: NOW, ...o,
});

const mockNeeds: jest.Mocked<IStatedNeedRepository> = {
  create: jest.fn(), findAllByUser: jest.fn(), findById: jest.fn(),
};
const mockRepo: jest.Mocked<IStatedNeedEscalationRepository> = {
  create: jest.fn(), findById: jest.fn(), findAllByStatedNeed: jest.fn(), acknowledge: jest.fn(), resolve: jest.fn(),
};
const mockOnCallHours: jest.Mocked<IOnCallHoursRepository> = {
  getOrCreate: jest.fn(), update: jest.fn(),
};
const mockNotifications = { notify: jest.fn() } as unknown as jest.Mocked<NotificationsService>;
const mockUsers = { findAll: jest.fn() } as unknown as jest.Mocked<UsersService>;

describe('NeedEscalationsService', () => {
  let service: NeedEscalationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        NeedEscalationsService,
        { provide: STATED_NEED_REPOSITORY, useValue: mockNeeds },
        { provide: NEED_ESCALATION_REPOSITORY, useValue: mockRepo },
        { provide: ON_CALL_HOURS_REPOSITORY, useValue: mockOnCallHours },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: UsersService, useValue: mockUsers },
      ],
    }).compile();
    service = m.get(NeedEscalationsService);
    jest.clearAllMocks();
    mockUsers.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50, totalPages: 0 });
  });

  describe('escalate', () => {
    it("creates an escalation for the caller's own stated need and pages every steward and admin", async () => {
      mockNeeds.findById.mockResolvedValue(makeNeed());
      mockRepo.create.mockResolvedValue(makeEscalation());
      mockUsers.findAll
        .mockResolvedValueOnce({ data: [{ id: 'steward-001' }] as never, total: 1, page: 1, limit: 50, totalPages: 1 })
        .mockResolvedValueOnce({ data: [{ id: 'admin-001' }] as never, total: 1, page: 1, limit: 50, totalPages: 1 });

      const result = await service.escalate('need-001', 'I need urgent help', 'user-001');

      expect(mockRepo.create).toHaveBeenCalledWith({ userId: 'user-001', statedNeedId: 'need-001', reason: 'I need urgent help' });
      expect(mockNotifications.notify).toHaveBeenCalledTimes(2);
      expect(mockNotifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ recipientId: 'steward-001', bypassPreferences: true }),
      );
      expect(result.status).toBe('PENDING');
    });

    it("forbids escalating another member's stated need", async () => {
      mockNeeds.findById.mockResolvedValue(makeNeed({ userId: 'user-001' }));

      await expect(service.escalate('need-001', undefined, 'other-999')).rejects.toThrow(ForbiddenException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a missing stated need', async () => {
      mockNeeds.findById.mockResolvedValue(null);

      await expect(service.escalate('ghost', undefined, 'user-001')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findEscalations', () => {
    it("retrieves every escalation recorded for the caller's own stated need", async () => {
      mockNeeds.findById.mockResolvedValue(makeNeed());
      mockRepo.findAllByStatedNeed.mockResolvedValue([makeEscalation(), makeEscalation({ id: 'esc-002' })]);

      const result = await service.findEscalations('need-001', 'user-001');

      expect(result).toHaveLength(2);
    });

    it("forbids listing another member's escalations", async () => {
      mockNeeds.findById.mockResolvedValue(makeNeed({ userId: 'user-001' }));

      await expect(service.findEscalations('need-001', 'other-999')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('acknowledge', () => {
    it('lets a Steward acknowledge an escalation', async () => {
      mockRepo.findById.mockResolvedValue(makeEscalation());
      mockRepo.acknowledge.mockResolvedValue(makeEscalation({ status: NeedEscalationStatus.ACKNOWLEDGED, acknowledgedAt: NOW }));

      const result = await service.acknowledge('esc-001', STEWARD);

      expect(mockRepo.acknowledge).toHaveBeenCalledWith('esc-001', 'steward-001');
      expect(result.status).toBe('ACKNOWLEDGED');
    });

    it('forbids a MEMBER from acknowledging an escalation', async () => {
      await expect(service.acknowledge('esc-001', MEMBER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a missing escalation', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.acknowledge('ghost', STEWARD)).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolve', () => {
    it('lets a Steward resolve an escalation with resolution notes', async () => {
      mockRepo.findById.mockResolvedValue(makeEscalation());
      mockRepo.resolve.mockResolvedValue(
        makeEscalation({ status: NeedEscalationStatus.RESOLVED, resolutionNotes: 'Called the member back.', resolvedAt: NOW }),
      );

      const result = await service.resolve('esc-001', 'Called the member back.', STEWARD);

      expect(mockRepo.resolve).toHaveBeenCalledWith('esc-001', 'steward-001', 'Called the member back.');
      expect(result.status).toBe('RESOLVED');
      expect(result.resolutionNotes).toBe('Called the member back.');
    });

    it('forbids a MEMBER from resolving an escalation', async () => {
      await expect(service.resolve('esc-001', undefined, MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('on-call hours', () => {
    it('returns the honest "not yet configured" state when no hours have been set', async () => {
      mockOnCallHours.getOrCreate.mockResolvedValue(makeOnCallHours());

      const result = await service.getOnCallHours();

      expect(result.hoursDescription).toBeNull();
    });

    it('lets a Steward publish the real on-call rotation', async () => {
      mockOnCallHours.update.mockResolvedValue(
        makeOnCallHours({ hoursDescription: 'Monday-Friday 9am-6pm ET', updatedById: 'steward-001' }),
      );

      const result = await service.setOnCallHours('Monday-Friday 9am-6pm ET', STEWARD);

      expect(mockOnCallHours.update).toHaveBeenCalledWith({ hoursDescription: 'Monday-Friday 9am-6pm ET', updatedById: 'steward-001' });
      expect(result.hoursDescription).toBe('Monday-Friday 9am-6pm ET');
    });

    it('forbids a MEMBER from setting on-call hours', async () => {
      await expect(service.setOnCallHours('9am-5pm', MEMBER)).rejects.toThrow(ForbiddenException);
      expect(mockOnCallHours.update).not.toHaveBeenCalled();
    });
  });
});
