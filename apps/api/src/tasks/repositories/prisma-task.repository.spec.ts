import { Test } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { PrismaTaskRepository } from './prisma-task.repository';
import { PrismaService } from '../../prisma/prisma.service';
import type { Task } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeTask = (o: Partial<Task> = {}): Task => ({
  id: 't-001', title: 'T', status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, position: 0,
  milestoneId: 'm-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const d = { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() };
const mockPrisma = { db: { task: d } } as unknown as PrismaService;

describe('PrismaTaskRepository', () => {
  let repo: PrismaTaskRepository;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [PrismaTaskRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    repo = m.get(PrismaTaskRepository);
    jest.clearAllMocks();
  });

  it('create', async () => {
    d.create.mockResolvedValue(makeTask());
    await repo.create({ title: 'T', milestoneId: 'm-001' });
    expect(d.create).toHaveBeenCalledWith({ data: { title: 'T', milestoneId: 'm-001' } });
  });

  it('findAll filters by milestoneId, status, priority', async () => {
    d.findMany.mockResolvedValue([]); d.count.mockResolvedValue(0);
    await repo.findAll({ page: 1, limit: 10, milestoneId: 'm-001', status: TaskStatus.COMPLETED, priority: TaskPriority.HIGH });
    expect(d.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ milestoneId: 'm-001', status: TaskStatus.COMPLETED, priority: TaskPriority.HIGH }) }),
    );
  });

  it('findAll orders by position then createdAt', async () => {
    d.findMany.mockResolvedValue([]); d.count.mockResolvedValue(0);
    await repo.findAll({ page: 1, limit: 5 });
    expect(d.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }),
    );
  });

  it('softDelete sets deletedAt', async () => {
    d.update.mockResolvedValue(makeTask({ deletedAt: NOW }));
    await repo.softDelete('t-001');
    expect(d.update).toHaveBeenCalledWith({ where: { id: 't-001' }, data: { deletedAt: expect.any(Date) } });
  });

  describe('findOwnerId', () => {
    it('resolves the owner via milestone → journey → goal', async () => {
      d.findFirst.mockResolvedValue({ milestone: { journey: { goal: { userId: 'u-001' } } } });
      expect(await repo.findOwnerId('t-001')).toBe('u-001');
      expect(d.findFirst).toHaveBeenCalledWith({
        where: { id: 't-001', deletedAt: null },
        select: { milestone: { select: { journey: { select: { goal: { select: { userId: true } } } } } } },
      });
    });

    it('returns null when the task does not exist', async () => {
      d.findFirst.mockResolvedValue(null);
      expect(await repo.findOwnerId('missing')).toBeNull();
    });
  });
});
