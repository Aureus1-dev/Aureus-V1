import { Test } from '@nestjs/testing';
import { MilestoneStatus } from '@prisma/client';
import { PrismaMilestoneRepository } from './prisma-milestone.repository';
import { PrismaService } from '../../prisma/prisma.service';
import type { Milestone } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeMs = (o: Partial<Milestone> = {}): Milestone => ({
  id: 'm-001', title: 'M', status: MilestoneStatus.PENDING, position: 0,
  journeyId: 'j-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const d = { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() };
const mockPrisma = { db: { milestone: d } } as unknown as PrismaService;

describe('PrismaMilestoneRepository', () => {
  let repo: PrismaMilestoneRepository;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [PrismaMilestoneRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    repo = m.get(PrismaMilestoneRepository);
    jest.clearAllMocks();
  });

  it('findAll includes deletedAt: null and journeyId filter', async () => {
    d.findMany.mockResolvedValue([]); d.count.mockResolvedValue(0);
    await repo.findAll({ page: 1, limit: 20, journeyId: 'j-001' });
    expect(d.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null, journeyId: 'j-001' }) }),
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
    d.update.mockResolvedValue(makeMs({ deletedAt: NOW }));
    await repo.softDelete('m-001');
    expect(d.update).toHaveBeenCalledWith({ where: { id: 'm-001' }, data: { deletedAt: expect.any(Date) } });
  });
});
