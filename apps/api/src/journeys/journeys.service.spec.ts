import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GoalStatus, JourneyStatus, UserRole } from '@prisma/client';
import { JourneysService } from './journeys.service';
import { JOURNEY_REPOSITORY, IJourneyRepository } from './repositories/journey.repository.interface';
import { GOAL_REPOSITORY, IGoalRepository } from '../goals/repositories/goal.repository.interface';
import { JourneyResponseDto } from './dto/journey-response.dto';
import type { Journey, Goal } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeJourney = (o: Partial<Journey> = {}): Journey => ({
  id: 'j-001', title: 'Test Journey', status: JourneyStatus.ACTIVE,
  goalId: 'g-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});
const makeGoal = (o: Partial<Goal> = {}): Goal => ({
  id: 'g-001', title: 'Test Goal', status: GoalStatus.ACTIVE,
  userId: 'u-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const OWNER: AuthenticatedUser = { id: 'u-001', email: 'owner@example.com', roles: [UserRole.MEMBER] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'u-002', email: 'other@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'u-admin', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const mockRepo: jest.Mocked<IJourneyRepository> = {
  create: jest.fn(), findById: jest.fn(), findByGoalId: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(), findOwnerId: jest.fn(),
};
const mockGoalRepo: jest.Mocked<IGoalRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(),
};

describe('JourneysService', () => {
  let service: JourneysService;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        JourneysService,
        { provide: JOURNEY_REPOSITORY, useValue: mockRepo },
        { provide: GOAL_REPOSITORY, useValue: mockGoalRepo },
      ],
    }).compile();
    service = m.get(JourneysService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates journey when the caller owns the goal and it has none', async () => {
      mockGoalRepo.findById.mockResolvedValue(makeGoal());
      mockRepo.findByGoalId.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeJourney());
      expect(await service.create({ title: 'J', goalId: 'g-001' }, OWNER)).toBeInstanceOf(JourneyResponseDto);
    });

    it('forbids creating a journey for a goal the caller does not own', async () => {
      mockGoalRepo.findById.mockResolvedValue(makeGoal());
      await expect(service.create({ title: 'J', goalId: 'g-001' }, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('allows an administrator to create a journey regardless of goal ownership', async () => {
      mockGoalRepo.findById.mockResolvedValue(makeGoal());
      mockRepo.findByGoalId.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeJourney());
      expect(await service.create({ title: 'J', goalId: 'g-001' }, ADMIN)).toBeInstanceOf(JourneyResponseDto);
    });

    it('throws NotFoundException when the goal does not exist', async () => {
      mockGoalRepo.findById.mockResolvedValue(null);
      await expect(service.create({ title: 'J', goalId: 'x' }, OWNER)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when goal already has a journey', async () => {
      mockGoalRepo.findById.mockResolvedValue(makeGoal());
      mockRepo.findByGoalId.mockResolvedValue(makeJourney());
      await expect(service.create({ title: 'J', goalId: 'g-001' }, OWNER)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('returns journey to its owner', async () => {
      mockRepo.findById.mockResolvedValue(makeJourney());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      expect(await service.findById('j-001', OWNER)).toBeInstanceOf(JourneyResponseDto);
    });
    it('returns journey to an administrator without resolving owner', async () => {
      mockRepo.findById.mockResolvedValue(makeJourney());
      expect(await service.findById('j-001', ADMIN)).toBeInstanceOf(JourneyResponseDto);
      expect(mockRepo.findOwnerId).not.toHaveBeenCalled();
    });
    it('forbids a non-owner member', async () => {
      mockRepo.findById.mockResolvedValue(makeJourney());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.findById('j-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('x', OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByGoalId', () => {
    it('returns journey for the owned goal', async () => {
      mockGoalRepo.findById.mockResolvedValue(makeGoal());
      mockRepo.findByGoalId.mockResolvedValue(makeJourney());
      expect(await service.findByGoalId('g-001', OWNER)).toBeInstanceOf(JourneyResponseDto);
    });
    it('forbids a non-owner member', async () => {
      mockGoalRepo.findById.mockResolvedValue(makeGoal());
      await expect(service.findByGoalId('g-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
    it('throws NotFoundException when no journey for goal', async () => {
      mockGoalRepo.findById.mockResolvedValue(makeGoal());
      mockRepo.findByGoalId.mockResolvedValue(null);
      await expect(service.findByGoalId('g-001', OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates journey for its owner', async () => {
      mockRepo.findById.mockResolvedValue(makeJourney());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      mockRepo.update.mockResolvedValue(makeJourney({ title: 'Updated' }));
      expect((await service.update('j-001', { title: 'Updated' }, OWNER)).title).toBe('Updated');
    });
    it('forbids a non-owner member', async () => {
      mockRepo.findById.mockResolvedValue(makeJourney());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.update('j-001', {}, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('x', {}, OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes for the owner', async () => {
      mockRepo.findById.mockResolvedValue(makeJourney());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      mockRepo.softDelete.mockResolvedValue(makeJourney({ deletedAt: NOW }));
      await expect(service.remove('j-001', OWNER)).resolves.toBeUndefined();
    });
    it('forbids a non-owner member', async () => {
      mockRepo.findById.mockResolvedValue(makeJourney());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.remove('j-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });
    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove('x', OWNER)).rejects.toThrow(NotFoundException);
    });
  });
});
