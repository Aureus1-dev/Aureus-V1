import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GoalStatus, UserRole } from '@prisma/client';
import { GoalsService } from './goals.service';
import { GOAL_REPOSITORY, IGoalRepository } from './repositories/goal.repository.interface';
import { GoalResponseDto } from './dto/goal-response.dto';
import type { Goal } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeGoal = (o: Partial<Goal> = {}): Goal => ({
  id: 'g-001', title: 'Test Goal', status: GoalStatus.ACTIVE,
  userId: 'u-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const OWNER: AuthenticatedUser = { id: 'u-001', email: 'owner@example.com', roles: [UserRole.MEMBER] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'u-002', email: 'other@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'u-admin', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

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
    it('defaults userId to the caller when omitted', async () => {
      mockRepo.create.mockResolvedValue(makeGoal());
      const result = await service.create({ title: 'Test' }, OWNER);
      expect(result).toBeInstanceOf(GoalResponseDto);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: OWNER.id }));
    });

    it('allows a member to create a goal for themselves explicitly', async () => {
      mockRepo.create.mockResolvedValue(makeGoal());
      await service.create({ title: 'Test', userId: OWNER.id }, OWNER);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: OWNER.id }));
    });

    it('forbids a member from creating a goal for another user', async () => {
      await expect(service.create({ title: 'Test', userId: OTHER_MEMBER.id }, OWNER))
        .rejects.toThrow(ForbiddenException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('allows an administrator to create a goal for another user', async () => {
      mockRepo.create.mockResolvedValue(makeGoal({ userId: OTHER_MEMBER.id }));
      await service.create({ title: 'Test', userId: OTHER_MEMBER.id }, ADMIN);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: OTHER_MEMBER.id }));
    });
  });

  describe('findAll', () => {
    it('scopes results to the caller by default', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [makeGoal()], total: 1, page: 1, limit: 20 });
      const result = await service.findAll({}, OWNER);
      expect(result.totalPages).toBe(1);
      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ userId: OWNER.id }));
    });

    it('forbids a member from listing another user\'s goals', async () => {
      await expect(service.findAll({ userId: OTHER_MEMBER.id }, OWNER)).rejects.toThrow(ForbiddenException);
    });

    it('allows an administrator to list without a userId filter', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAll({}, ADMIN);
      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ userId: undefined }));
    });

    it('allows an administrator to list a specific user\'s goals', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAll({ userId: OTHER_MEMBER.id }, ADMIN);
      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ userId: OTHER_MEMBER.id }));
    });
  });

  describe('findById', () => {
    it('returns the goal to its owner', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      expect(await service.findById('g-001', OWNER)).toBeInstanceOf(GoalResponseDto);
    });
    it('returns the goal to an administrator', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      expect(await service.findById('g-001', ADMIN)).toBeInstanceOf(GoalResponseDto);
    });
    it('forbids a non-owner member', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      await expect(service.findById('g-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
    it('throws NotFoundException when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('x', OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates the goal for its owner', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      mockRepo.update.mockResolvedValue(makeGoal({ title: 'Updated' }));
      const result = await service.update('g-001', { title: 'Updated' }, OWNER);
      expect(result.title).toBe('Updated');
    });
    it('forbids a non-owner member from updating', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      await expect(service.update('g-001', {}, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
    it('allows an administrator to update', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      mockRepo.update.mockResolvedValue(makeGoal({ title: 'Updated' }));
      await service.update('g-001', { title: 'Updated' }, ADMIN);
      expect(mockRepo.update).toHaveBeenCalled();
    });
    it('throws NotFoundException when goal not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('x', {}, OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes for the owner', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      mockRepo.softDelete.mockResolvedValue(makeGoal({ deletedAt: NOW }));
      await expect(service.remove('g-001', OWNER)).resolves.toBeUndefined();
    });
    it('forbids a non-owner member from removing', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      await expect(service.remove('g-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });
    it('allows an administrator to remove regardless of ownership', async () => {
      mockRepo.findById.mockResolvedValue(makeGoal());
      mockRepo.softDelete.mockResolvedValue(makeGoal({ deletedAt: NOW }));
      await expect(service.remove('g-001', ADMIN)).resolves.toBeUndefined();
    });
    it('throws NotFoundException when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove('x', OWNER)).rejects.toThrow(NotFoundException);
    });
  });
});
