import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JourneyStatus, MilestoneStatus, UserRole } from '@prisma/client';
import { MilestonesService } from './milestones.service';
import { IMilestoneRepository, MILESTONE_REPOSITORY } from './repositories/milestone.repository.interface';
import { JOURNEY_REPOSITORY, IJourneyRepository } from '../journeys/repositories/journey.repository.interface';
import { MilestoneResponseDto } from './dto/milestone-response.dto';
import type { Milestone, Journey } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeMs = (o: Partial<Milestone> = {}): Milestone => ({
  id: 'm-001', title: 'Test MS', status: MilestoneStatus.PENDING, position: 0,
  journeyId: 'j-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});
const makeJourney = (o: Partial<Journey> = {}): Journey => ({
  id: 'j-001', title: 'Test Journey', status: JourneyStatus.ACTIVE,
  goalId: 'g-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const OWNER: AuthenticatedUser = { id: 'u-001', email: 'owner@example.com', roles: [UserRole.MEMBER] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'u-002', email: 'other@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'u-admin', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const mockRepo: jest.Mocked<IMilestoneRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(), findOwnerId: jest.fn(),
};
const mockJourneyRepo: jest.Mocked<IJourneyRepository> = {
  create: jest.fn(), findById: jest.fn(), findByGoalId: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(), findOwnerId: jest.fn(),
};

describe('MilestonesService', () => {
  let service: MilestonesService;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        MilestonesService,
        { provide: MILESTONE_REPOSITORY, useValue: mockRepo },
        { provide: JOURNEY_REPOSITORY, useValue: mockJourneyRepo },
      ],
    }).compile();
    service = m.get(MilestonesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a milestone when the caller owns the journey', async () => {
      mockJourneyRepo.findById.mockResolvedValue(makeJourney());
      mockJourneyRepo.findOwnerId.mockResolvedValue(OWNER.id);
      mockRepo.create.mockResolvedValue(makeMs());
      expect(await service.create({ title: 'M', journeyId: 'j-001' }, OWNER)).toBeInstanceOf(MilestoneResponseDto);
    });

    it('forbids creating a milestone in a journey the caller does not own', async () => {
      mockJourneyRepo.findById.mockResolvedValue(makeJourney());
      mockJourneyRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.create({ title: 'M', journeyId: 'j-001' }, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('allows an administrator regardless of journey ownership', async () => {
      mockJourneyRepo.findById.mockResolvedValue(makeJourney());
      mockRepo.create.mockResolvedValue(makeMs());
      expect(await service.create({ title: 'M', journeyId: 'j-001' }, ADMIN)).toBeInstanceOf(MilestoneResponseDto);
      expect(mockJourneyRepo.findOwnerId).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the journey does not exist', async () => {
      mockJourneyRepo.findById.mockResolvedValue(null);
      await expect(service.create({ title: 'M', journeyId: 'x' }, OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('forbids non-admins from listing without a journeyId', async () => {
      await expect(service.findAll({}, OWNER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.findAll).not.toHaveBeenCalled();
    });

    it('allows an administrator to list without a journeyId', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      const r = await service.findAll({}, ADMIN);
      expect(r.totalPages).toBe(0);
    });

    it('lists milestones for a journey the caller owns', async () => {
      mockJourneyRepo.findById.mockResolvedValue(makeJourney());
      mockJourneyRepo.findOwnerId.mockResolvedValue(OWNER.id);
      mockRepo.findAll.mockResolvedValue({ data: [makeMs()], total: 1, page: 1, limit: 20 });
      const r = await service.findAll({ journeyId: 'j-001' }, OWNER);
      expect(r.data).toHaveLength(1);
    });

    it('forbids listing for a journey the caller does not own', async () => {
      mockJourneyRepo.findById.mockResolvedValue(makeJourney());
      mockJourneyRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.findAll({ journeyId: 'j-001' }, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findById', () => {
    it('returns milestone to its owner', async () => {
      mockRepo.findById.mockResolvedValue(makeMs());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      expect(await service.findById('m-001', OWNER)).toBeInstanceOf(MilestoneResponseDto);
    });
    it('forbids a non-owner member', async () => {
      mockRepo.findById.mockResolvedValue(makeMs());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.findById('m-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('x', OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates for the owner', async () => {
      mockRepo.findById.mockResolvedValue(makeMs());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      mockRepo.update.mockResolvedValue(makeMs({ title: 'Updated' }));
      expect((await service.update('m-001', { title: 'Updated' }, OWNER)).title).toBe('Updated');
    });
    it('forbids a non-owner member', async () => {
      mockRepo.findById.mockResolvedValue(makeMs());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.update('m-001', {}, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
    it('throws NotFoundException when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('x', {}, OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes for the owner', async () => {
      mockRepo.findById.mockResolvedValue(makeMs());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      mockRepo.softDelete.mockResolvedValue(makeMs({ deletedAt: NOW }));
      await expect(service.remove('m-001', OWNER)).resolves.toBeUndefined();
    });
    it('forbids a non-owner member', async () => {
      mockRepo.findById.mockResolvedValue(makeMs());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.remove('m-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove('x', OWNER)).rejects.toThrow(NotFoundException);
    });
  });
});
