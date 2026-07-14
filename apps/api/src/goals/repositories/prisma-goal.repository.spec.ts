import { Test } from '@nestjs/testing';
import { GoalStatus } from '@prisma/client';
import { PrismaGoalRepository } from './prisma-goal.repository';
import { PrismaService } from '../../prisma/prisma.service';
import type { Goal } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeGoal = (o: Partial<Goal> = {}): Goal => ({
  id: 'g-001', title: 'Test', status: GoalStatus.ACTIVE,
  userId: 'u-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const goalDelegate = { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() };
const mockPrisma = { db: { goal: goalDelegate } } as unknown as PrismaService;

describe('PrismaGoalRepository', () => {
  let repo: PrismaGoalRepository;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [PrismaGoalRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    repo = m.get(PrismaGoalRepository);
    jest.clearAllMocks();
  });

  it('create calls db.goal.create', async () => {
    goalDelegate.create.mockResolvedValue(makeGoal());
    await repo.create({ title: 'T', userId: 'u-001' });
    expect(goalDelegate.create).toHaveBeenCalledWith({ data: { title: 'T', userId: 'u-001' } });
  });

  it('findById queries with deletedAt: null', async () => {
    goalDelegate.findFirst.mockResolvedValue(makeGoal());
    await repo.findById('g-001');
    expect(goalDelegate.findFirst).toHaveBeenCalledWith({ where: { id: 'g-001', deletedAt: null } });
  });

  it('findAll applies page offset and optional filters', async () => {
    goalDelegate.findMany.mockResolvedValue([]);
    goalDelegate.count.mockResolvedValue(0);
    await repo.findAll({ page: 2, limit: 10, userId: 'u-001', status: GoalStatus.PAUSED });
    expect(goalDelegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10, where: expect.objectContaining({ userId: 'u-001', status: GoalStatus.PAUSED }) }),
    );
  });

  it('softDelete sets deletedAt', async () => {
    goalDelegate.update.mockResolvedValue(makeGoal({ deletedAt: NOW }));
    await repo.softDelete('g-001');
    expect(goalDelegate.update).toHaveBeenCalledWith({ where: { id: 'g-001' }, data: { deletedAt: expect.any(Date) } });
  });
});
