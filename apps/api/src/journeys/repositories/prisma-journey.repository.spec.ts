import { Test } from '@nestjs/testing';
import { JourneyStatus } from '@prisma/client';
import { PrismaJourneyRepository } from './prisma-journey.repository';
import { PrismaService } from '../../prisma/prisma.service';
import type { Journey } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeJ = (o: Partial<Journey> = {}): Journey => ({
  id: 'j-001', title: 'J', status: JourneyStatus.ACTIVE,
  goalId: 'g-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const d = { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() };
const mockPrisma = { db: { journey: d } } as unknown as PrismaService;

describe('PrismaJourneyRepository', () => {
  let repo: PrismaJourneyRepository;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [PrismaJourneyRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    repo = m.get(PrismaJourneyRepository);
    jest.clearAllMocks();
  });

  it('create', async () => {
    d.create.mockResolvedValue(makeJ());
    await repo.create({ title: 'J', goalId: 'g-001' });
    expect(d.create).toHaveBeenCalledWith({ data: { title: 'J', goalId: 'g-001' } });
  });

  it('findById queries with id and deletedAt: null', async () => {
    d.findFirst.mockResolvedValue(makeJ());
    await repo.findById('j-001');
    expect(d.findFirst).toHaveBeenCalledWith({ where: { id: 'j-001', deletedAt: null } });
  });

  it('findByGoalId queries with goalId and deletedAt: null', async () => {
    d.findFirst.mockResolvedValue(makeJ());
    await repo.findByGoalId('g-001');
    expect(d.findFirst).toHaveBeenCalledWith({ where: { goalId: 'g-001', deletedAt: null } });
  });

  it('softDelete sets deletedAt', async () => {
    d.update.mockResolvedValue(makeJ({ deletedAt: NOW }));
    await repo.softDelete('j-001');
    expect(d.update).toHaveBeenCalledWith({ where: { id: 'j-001' }, data: { deletedAt: expect.any(Date) } });
  });
});
