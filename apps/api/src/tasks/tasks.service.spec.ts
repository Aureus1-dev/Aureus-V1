import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { TasksService } from './tasks.service';
import { ITaskRepository, TASK_REPOSITORY } from './repositories/task.repository.interface';
import { TaskResponseDto } from './dto/task-response.dto';
import type { Task } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeTask = (o: Partial<Task> = {}): Task => ({
  id: 't-001', title: 'Test Task', status: TaskStatus.PENDING,
  priority: TaskPriority.MEDIUM, position: 0,
  milestoneId: 'm-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<ITaskRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(),
};

describe('TasksService', () => {
  let service: TasksService;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [TasksService, { provide: TASK_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(TasksService);
    jest.clearAllMocks();
  });

  it('creates a task', async () => {
    mockRepo.create.mockResolvedValue(makeTask());
    expect(await service.create({ title: 'T', milestoneId: 'm-001' })).toBeInstanceOf(TaskResponseDto);
  });

  it('findAll returns paginated tasks', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [makeTask()], total: 1, page: 1, limit: 20 });
    const r = await service.findAll({});
    expect(r.totalPages).toBe(1);
    expect(r.data[0]).toBeInstanceOf(TaskResponseDto);
  });

  it('findAll forwards milestoneId, status, priority filters', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
    await service.findAll({ milestoneId: 'm-001', status: TaskStatus.COMPLETED, priority: TaskPriority.HIGH });
    expect(mockRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ milestoneId: 'm-001', status: TaskStatus.COMPLETED, priority: TaskPriority.HIGH }),
    );
  });

  it('findById throws NotFoundException', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.findById('x')).rejects.toThrow(NotFoundException);
  });

  it('update updates task', async () => {
    mockRepo.findById.mockResolvedValue(makeTask());
    mockRepo.update.mockResolvedValue(makeTask({ status: TaskStatus.IN_PROGRESS }));
    const r = await service.update('t-001', { status: TaskStatus.IN_PROGRESS });
    expect(r.status).toBe(TaskStatus.IN_PROGRESS);
  });

  it('update throws NotFoundException', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.update('x', {})).rejects.toThrow(NotFoundException);
  });

  it('remove soft-deletes task', async () => {
    mockRepo.findById.mockResolvedValue(makeTask());
    mockRepo.softDelete.mockResolvedValue(makeTask({ deletedAt: NOW }));
    await expect(service.remove('t-001')).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.remove('x')).rejects.toThrow(NotFoundException);
  });
});
