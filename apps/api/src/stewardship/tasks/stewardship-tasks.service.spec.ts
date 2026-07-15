import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StewardshipRelationshipOrigin, StewardshipRelationshipStatus, StewardshipTaskStatus, UserRole } from '@prisma/client';
import { StewardshipTasksService } from './stewardship-tasks.service';
import { STEWARDSHIP_TASK_REPOSITORY, IStewardshipTaskRepository } from './repositories/stewardship-task.repository.interface';
import {
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
  IStewardshipRelationshipRepository,
} from '../relationships/repositories/stewardship-relationship.repository.interface';
import type { StewardshipTask, StewardshipRelationship } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const OTHER: AuthenticatedUser = { id: 'other-001', email: 'o@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeRelationship = (o: Partial<StewardshipRelationship> = {}): StewardshipRelationship => ({
  id: 'rel-001', memberId: MEMBER.id, stewardId: STEWARD.id,
  status: StewardshipRelationshipStatus.ACTIVE, origin: StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT,
  requestedById: null, assignedById: ADMIN.id, assignedByOrganizationId: null, recommendedById: null,
  endReason: null, endedById: null, endedAt: null, activatedAt: NOW, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeTask = (o: Partial<StewardshipTask> = {}): StewardshipTask => ({
  id: 'stask-001', relationshipId: 'rel-001', title: 'Follow up', description: null,
  status: StewardshipTaskStatus.PENDING, dueDate: null, createdById: STEWARD.id,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IStewardshipTaskRepository> = {
  create: jest.fn(), findById: jest.fn(), findByRelationship: jest.fn(), update: jest.fn(), countByStewardAndStatus: jest.fn(),
};
const mockRelationshipRepo: jest.Mocked<IStewardshipRelationshipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), countActiveByStewardId: jest.fn(), update: jest.fn(),
};

describe('StewardshipTasksService', () => {
  let service: StewardshipTasksService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        StewardshipTasksService,
        { provide: STEWARDSHIP_TASK_REPOSITORY, useValue: mockRepo },
        { provide: STEWARDSHIP_RELATIONSHIP_REPOSITORY, useValue: mockRelationshipRepo },
      ],
    }).compile();
    service = m.get(StewardshipTasksService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('allows the assigned steward to create a follow-up task', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.create.mockResolvedValue(makeTask());
      const result = await service.create('rel-001', { title: 'Follow up' }, STEWARD);
      expect(result.title).toBe('Follow up');
    });

    it('forbids the member from creating a follow-up task', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.create('rel-001', { title: 'x' }, MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByRelationship', () => {
    it('is visible to the member (read-only)', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.findByRelationship.mockResolvedValue([makeTask()]);
      const result = await service.findByRelationship('rel-001', MEMBER);
      expect(result).toHaveLength(1);
    });

    it('forbids an unrelated caller', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.findByRelationship('rel-001', OTHER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('allows the steward to update status', async () => {
      mockRepo.findById.mockResolvedValue(makeTask());
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.update.mockResolvedValue(makeTask({ status: StewardshipTaskStatus.COMPLETED }));
      const result = await service.update('stask-001', { status: StewardshipTaskStatus.COMPLETED }, STEWARD);
      expect(result.status).toBe(StewardshipTaskStatus.COMPLETED);
    });

    it('forbids the member from updating', async () => {
      mockRepo.findById.mockResolvedValue(makeTask());
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.update('stask-001', { status: StewardshipTaskStatus.COMPLETED }, MEMBER))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing task', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('x', {}, STEWARD)).rejects.toThrow(NotFoundException);
    });
  });
});
