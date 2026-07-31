import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaAiOperationalConfigRepository } from './prisma-ai-operational-config.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AiOperationalConfig } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeConfig = (o: Partial<AiOperationalConfig> = {}): AiOperationalConfig => ({
  id: 'singleton', emergencyStop: false, globalDailyBudgetUsd: 100, userDailyBudgetUsd: 5,
  updatedById: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
  code: 'P2002', clientVersion: 'test',
});

const configDelegate = { upsert: jest.fn(), findUniqueOrThrow: jest.fn() };
const mockPrisma = { db: { aiOperationalConfig: configDelegate } } as unknown as PrismaService;

describe('PrismaAiOperationalConfigRepository', () => {
  let repo: PrismaAiOperationalConfigRepository;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [PrismaAiOperationalConfigRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    repo = m.get(PrismaAiOperationalConfigRepository);
    jest.clearAllMocks();
  });

  it('returns the upserted row on the ordinary, uncontested path', async () => {
    configDelegate.upsert.mockResolvedValue(makeConfig());

    const result = await repo.getOrCreate({ emergencyStop: false, globalDailyBudgetUsd: 100, userDailyBudgetUsd: 5 });

    expect(result.id).toBe('singleton');
    expect(configDelegate.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('falls back to reading the row when a concurrent first-ever call already created it (P2002)', async () => {
    // Two or more AI completions can fire concurrently within one request
    // (e.g. a COORDINATED_PLAN orchestration's per-category Promise.all) —
    // the very first time this singleton is read, they race to create it.
    configDelegate.upsert.mockRejectedValue(uniqueConstraintError);
    configDelegate.findUniqueOrThrow.mockResolvedValue(makeConfig());

    const result = await repo.getOrCreate({ emergencyStop: false, globalDailyBudgetUsd: 100, userDailyBudgetUsd: 5 });

    expect(result.id).toBe('singleton');
    expect(configDelegate.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'singleton' } });
  });

  it('rethrows any other error without masking it as a race', async () => {
    const otherError = new Error('db unavailable');
    configDelegate.upsert.mockRejectedValue(otherError);

    await expect(
      repo.getOrCreate({ emergencyStop: false, globalDailyBudgetUsd: 100, userDailyBudgetUsd: 5 }),
    ).rejects.toThrow('db unavailable');
    expect(configDelegate.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
