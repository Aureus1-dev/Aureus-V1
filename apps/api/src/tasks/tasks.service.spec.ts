import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MilestoneStatus, TaskPriority, TaskStatus, UserRole } from '@prisma/client';
import { TasksService } from './tasks.service';
import { ITaskRepository, TASK_REPOSITORY } from './repositories/task.repository.interface';
import { MILESTONE_REPOSITORY, IMilestoneRepository } from '../milestones/repositories/milestone.repository.interface';
import { TaskResponseDto } from './dto/task-response.dto';
import type { Task, Milestone } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeTask = (o: Partial<Task> = {}): Task => ({
  id: 't-001', title: 'Test Task', status: TaskStatus.PENDING,
  priority: TaskPriority.MEDIUM, position: 0,
  milestoneId: 'm-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});
const makeMs = (o: Partial<Milestone> = {}): Milestone => ({
  id: 'm-001', title: 'Test MS', status: MilestoneStatus.PENDING, position: 0,
  journeyId: 'j-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const OWNER: AuthenticatedUser = { id: 'u-001', email: 'owner@example.com', roles: [UserRole.MEMBER] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'u-002', email: 'other@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'u-admin', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const mockRepo: jest.Mocked<ITaskRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(), findOwnerId: jest.fn(),
};
const mockMilestoneRepo: jest.Mocked<IMilestoneRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(), findOwnerId: jest.fn(),
};

describe('TasksService', () => {
  let service: TasksService;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TASK_REPOSITORY, useValue: mockRepo },
        { provide: MILESTONE_REPOSITORY, useValue: mockMilestoneRepo },
      ],
    }).compile();
    service = m.get(TasksService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a task when the caller owns the milestone', async () => {
      mockMilestoneRepo.findById.mockResolvedValue(makeMs());
      mockMilestoneRepo.findOwnerId.mockResolvedValue(OWNER.id);
      mockRepo.create.mockResolvedValue(makeTask());
      expect(await service.create({ title: 'T', milestoneId: 'm-001' }, OWNER)).toBeInstanceOf(TaskResponseDto);
    });

    it('forbids creating a task in a milestone the caller does not own', async () => {
      mockMilestoneRepo.findById.mockResolvedValue(makeMs());
      mockMilestoneRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.create({ title: 'T', milestoneId: 'm-001' }, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('allows an administrator regardless of milestone ownership', async () => {
      mockMilestoneRepo.findById.mockResolvedValue(makeMs());
      mockRepo.create.mockResolvedValue(makeTask());
      expect(await service.create({ title: 'T', milestoneId: 'm-001' }, ADMIN)).toBeInstanceOf(TaskResponseDto);
    });

    it('throws NotFoundException when the milestone does not exist', async () => {
      mockMilestoneRepo.findById.mockResolvedValue(null);
      await expect(service.create({ title: 'T', milestoneId: 'x' }, OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('scopes a non-admin to their own tasks across every milestone when no milestoneId is given (PR-002)', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [makeTask()], total: 1, page: 1, limit: 20 });
      const r = await service.findAll({}, OWNER);

      expect(mockRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ userId: OWNER.id, milestoneId: undefined }),
      );
      expect(r.data).toHaveLength(1);
    });

    it('allows an administrator to list every task platform-wide without a milestoneId', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      const r = await service.findAll({}, ADMIN);

      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ userId: undefined }));
      expect(r.totalPages).toBe(0);
    });

    it('lists tasks for a milestone the caller owns', async () => {
      mockMilestoneRepo.findById.mockResolvedValue(makeMs());
      mockMilestoneRepo.findOwnerId.mockResolvedValue(OWNER.id);
      mockRepo.findAll.mockResolvedValue({ data: [makeTask()], total: 1, page: 1, limit: 20 });
      const r = await service.findAll({ milestoneId: 'm-001' }, OWNER);
      expect(r.data).toHaveLength(1);
    });

    it('forbids listing for a milestone the caller does not own', async () => {
      mockMilestoneRepo.findById.mockResolvedValue(makeMs());
      mockMilestoneRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.findAll({ milestoneId: 'm-001' }, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findById', () => {
    it('returns task to its owner', async () => {
      mockRepo.findById.mockResolvedValue(makeTask());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      expect(await service.findById('t-001', OWNER)).toBeInstanceOf(TaskResponseDto);
    });
    it('forbids a non-owner member', async () => {
      mockRepo.findById.mockResolvedValue(makeTask());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.findById('t-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('x', OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates task for the owner', async () => {
      mockRepo.findById.mockResolvedValue(makeTask());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      mockRepo.update.mockResolvedValue(makeTask({ status: TaskStatus.IN_PROGRESS }));
      const r = await service.update('t-001', { status: TaskStatus.IN_PROGRESS }, OWNER);
      expect(r.status).toBe(TaskStatus.IN_PROGRESS);
    });
    it('forbids a non-owner member', async () => {
      mockRepo.findById.mockResolvedValue(makeTask());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.update('t-001', {}, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('x', {}, OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes task for the owner', async () => {
      mockRepo.findById.mockResolvedValue(makeTask());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      mockRepo.softDelete.mockResolvedValue(makeTask({ deletedAt: NOW }));
      await expect(service.remove('t-001', OWNER)).resolves.toBeUndefined();
    });
    it('forbids a non-owner member', async () => {
      mockRepo.findById.mockResolvedValue(makeTask());
      mockRepo.findOwnerId.mockResolvedValue(OWNER.id);
      await expect(service.remove('t-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove('x', OWNER)).rejects.toThrow(NotFoundException);
    });
  });
});
