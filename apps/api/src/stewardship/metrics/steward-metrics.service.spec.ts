import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { GoalStatus, MilestoneStatus, UserRole } from '@prisma/client';
import { StewardMetricsService } from './steward-metrics.service';
import {
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
  IStewardshipRelationshipRepository,
} from '../relationships/repositories/stewardship-relationship.repository.interface';
import { STEWARD_CAPACITY_REPOSITORY, IStewardCapacityRepository } from '../capacity/repositories/steward-capacity.repository.interface';
import { STEWARDSHIP_TASK_REPOSITORY, IStewardshipTaskRepository } from '../tasks/repositories/stewardship-task.repository.interface';
import {
  STEWARDSHIP_ESCALATION_REPOSITORY,
  IStewardshipEscalationRepository,
} from '../escalations/repositories/stewardship-escalation.repository.interface';
import { GOAL_REPOSITORY, IGoalRepository } from '../../goals/repositories/goal.repository.interface';
import { JOURNEY_REPOSITORY, IJourneyRepository } from '../../journeys/repositories/journey.repository.interface';
import { MILESTONE_REPOSITORY, IMilestoneRepository } from '../../milestones/repositories/milestone.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Goal, Journey, Milestone, StewardCapacity } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const OTHER_STEWARD: AuthenticatedUser = { id: 'steward-002', email: 's2@example.com', roles: [UserRole.STEWARD] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const mockRelationshipRepo: jest.Mocked<IStewardshipRelationshipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), countActiveByStewardId: jest.fn(), update: jest.fn(),
};
const mockCapacityRepo: jest.Mocked<IStewardCapacityRepository> = { findOrCreate: jest.fn(), update: jest.fn() };
const mockTaskRepo: jest.Mocked<IStewardshipTaskRepository> = {
  create: jest.fn(), findById: jest.fn(), findByRelationship: jest.fn(), update: jest.fn(), countByStewardAndStatus: jest.fn(),
};
const mockEscalationRepo: jest.Mocked<IStewardshipEscalationRepository> = {
  create: jest.fn(), findById: jest.fn(), findByRelationship: jest.fn(), findByPod: jest.fn(),
  update: jest.fn(), countByStewardAndStatus: jest.fn(), countByStatus: jest.fn(),
};
const mockGoalRepo: jest.Mocked<IGoalRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockJourneyRepo: jest.Mocked<IJourneyRepository> = {
  create: jest.fn(), findById: jest.fn(), findByGoalId: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findOwnerId: jest.fn(),
};
const mockMilestoneRepo: jest.Mocked<IMilestoneRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findOwnerId: jest.fn(),
};

const makeCapacity = (o: Partial<StewardCapacity> = {}): StewardCapacity => ({
  id: 'cap-001', stewardId: STEWARD.id, maxActiveMembers: 25, updatedById: STEWARD.id, createdAt: NOW, updatedAt: NOW, ...o,
});

describe('StewardMetricsService', () => {
  let service: StewardMetricsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        StewardMetricsService,
        { provide: STEWARDSHIP_RELATIONSHIP_REPOSITORY, useValue: mockRelationshipRepo },
        { provide: STEWARD_CAPACITY_REPOSITORY, useValue: mockCapacityRepo },
        { provide: STEWARDSHIP_TASK_REPOSITORY, useValue: mockTaskRepo },
        { provide: STEWARDSHIP_ESCALATION_REPOSITORY, useValue: mockEscalationRepo },
        { provide: GOAL_REPOSITORY, useValue: mockGoalRepo },
        { provide: JOURNEY_REPOSITORY, useValue: mockJourneyRepo },
        { provide: MILESTONE_REPOSITORY, useValue: mockMilestoneRepo },
      ],
    }).compile();
    service = m.get(StewardMetricsService);
    jest.clearAllMocks();
  });

  it('forbids a different steward from viewing metrics', async () => {
    await expect(service.getForSteward(STEWARD.id, OTHER_STEWARD)).rejects.toThrow(ForbiddenException);
  });

  it('allows the steward to view their own metrics', async () => {
    mockRelationshipRepo.countActiveByStewardId.mockResolvedValue(3);
    mockCapacityRepo.findOrCreate.mockResolvedValue(makeCapacity());
    mockTaskRepo.countByStewardAndStatus.mockResolvedValue(7);
    mockEscalationRepo.countByStewardAndStatus.mockResolvedValue(2);
    mockRelationshipRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 });

    const result = await service.getForSteward(STEWARD.id, STEWARD);
    expect(result.activeMemberCount).toBe(3);
    expect(result.capacity).toBe(25);
    expect(result.tasksCompleted).toBe(7);
    expect(result.escalationsResolved).toBe(2);
    expect(result.memberGoalCompletionRate).toBeNull();
    expect(result.averageJourneyProgress).toBeNull();
    expect(result.averageResponseTimeHours).toBeNull();
    expect(result.memberSatisfactionScore).toBeNull();
  });

  it('allows a platform administrator to view any steward\'s metrics', async () => {
    mockRelationshipRepo.countActiveByStewardId.mockResolvedValue(0);
    mockCapacityRepo.findOrCreate.mockResolvedValue(makeCapacity());
    mockTaskRepo.countByStewardAndStatus.mockResolvedValue(0);
    mockEscalationRepo.countByStewardAndStatus.mockResolvedValue(0);
    mockRelationshipRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 });

    await expect(service.getForSteward(STEWARD.id, ADMIN)).resolves.toBeDefined();
  });

  it('computes goal completion rate and journey progress across assigned members', async () => {
    mockRelationshipRepo.countActiveByStewardId.mockResolvedValue(1);
    mockCapacityRepo.findOrCreate.mockResolvedValue(makeCapacity());
    mockTaskRepo.countByStewardAndStatus.mockResolvedValue(0);
    mockEscalationRepo.countByStewardAndStatus.mockResolvedValue(0);
    mockRelationshipRepo.findAll.mockResolvedValue({
      data: [{ memberId: 'member-001' } as never], total: 1, page: 1, limit: 100,
    });

    const goals: Goal[] = [
      { id: 'g-1', title: 'G1', status: GoalStatus.COMPLETED, userId: 'member-001', createdAt: NOW, updatedAt: NOW, deletedAt: null },
      { id: 'g-2', title: 'G2', status: GoalStatus.ACTIVE, userId: 'member-001', createdAt: NOW, updatedAt: NOW, deletedAt: null },
    ];
    mockGoalRepo.findAll.mockResolvedValue({ data: goals, total: 2, page: 1, limit: 100 });

    const journey: Journey = { id: 'j-1', title: 'J1', status: 'ACTIVE' as never, goalId: 'g-1', createdAt: NOW, updatedAt: NOW, deletedAt: null };
    mockJourneyRepo.findByGoalId.mockImplementation(async (goalId: string) => (goalId === 'g-1' ? journey : null));

    const milestones: Milestone[] = [
      { id: 'm-1', title: 'M1', status: MilestoneStatus.COMPLETED, position: 0, journeyId: 'j-1', createdAt: NOW, updatedAt: NOW, deletedAt: null },
      { id: 'm-2', title: 'M2', status: MilestoneStatus.PENDING, position: 1, journeyId: 'j-1', createdAt: NOW, updatedAt: NOW, deletedAt: null },
    ];
    mockMilestoneRepo.findAll.mockResolvedValue({ data: milestones, total: 2, page: 1, limit: 100 });

    const result = await service.getForSteward(STEWARD.id, STEWARD);
    expect(result.memberGoalCompletionRate).toBe(50);
    expect(result.averageJourneyProgress).toBe(50);
  });
});
