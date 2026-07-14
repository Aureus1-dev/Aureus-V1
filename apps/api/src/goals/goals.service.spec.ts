import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GoalStatus } from '@prisma/client';
import { GoalsService } from './goals.service';
import { GOAL_REPOSITORY, IGoalRepository } from './repositories/goal.repository.interface';
import { GoalResponseDto } from './dto/goal-response.dto';
import type { Goal } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeGoal = (o: Partial<Goal> = {}): Goal => ({
  id: 'g-001', title: 'Test Goal', status: GoalStatus.ACTIVE,
  userId: 'u-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<IGoalRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(),
};

describe('GoalsService', () => {
  let service: GoalsService;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [GoalsService, { provide: GOAL_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(GoalsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates and returns a GoalResponseDto', async () => {
      mockRepo.create.mockResolvedValue(makeGoal());
      const result = await service.create({ title: 'Test', userId: 'u-001' });
      expect(result).toBeInstanceOf(GoalResponseDto);
      expect(result.title).toBe('Test Goal');
    });
  });

  describe('findAll', () => {
    it('returns paginated goals with totalPages', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [makeGoal()], total: 1, page: 1, limit: 20 });
      const result = await service.findAll({});
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('forwards userId and status filters', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAll({ userId: 'u-001', status: GoalStatus.PAUSED });
      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u-001', status: GoalStatus.PAUSED }));
    });
  });

  describe('findById', () => {
    it('returns goal when found', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      expect(await service.findById('g-001')).toBeInstanceOf(GoalResponseDto);
    });
    it('throws NotFoundException when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates and returns goal', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      mockRepo.update.mockResolvedValue(makeGoal({ title: 'Updated' }));
      const result = await service.update('g-001', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });
    it('throws NotFoundException when goal not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('x', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes when found', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      mockRepo.softDelete.mockResolvedValue(makeGoal({ deletedAt: NOW }));
      await expect(service.remove('g-001')).resolves.toBeUndefined();
    });
    it('throws NotFoundException when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });
  });
});
