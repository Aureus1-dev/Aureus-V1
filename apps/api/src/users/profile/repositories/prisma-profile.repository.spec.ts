import { Test } from '@nestjs/testing';
import { PrismaProfileRepository } from './prisma-profile.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import type { Profile } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeProfile = (o: Partial<Profile> = {}): Profile => ({
  id: 'p-001', userId: 'u-001', displayName: 'Alice', bio: null, avatarUrl: null,
  createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const d = { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() };
const mockPrisma = { db: { profile: d } } as unknown as PrismaService;

describe('PrismaProfileRepository', () => {
  let repo: PrismaProfileRepository;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [PrismaProfileRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    repo = m.get(PrismaProfileRepository);
    jest.clearAllMocks();
  });

  it('create', async () => {
    d.create.mockResolvedValue(makeProfile());
    await repo.create({ userId: 'u-001', displayName: 'Alice' });
    expect(d.create).toHaveBeenCalledWith({ data: { userId: 'u-001', displayName: 'Alice' } });
  });

  it('findByUserId queries with userId and deletedAt: null', async () => {
    d.findFirst.mockResolvedValue(makeProfile());
    await repo.findByUserId('u-001');
    expect(d.findFirst).toHaveBeenCalledWith({ where: { userId: 'u-001', deletedAt: null } });
  });

  it('update uses userId as where clause', async () => {
    d.update.mockResolvedValue(makeProfile({ displayName: 'Bob' }));
    await repo.update('u-001', { displayName: 'Bob' });
    expect(d.update).toHaveBeenCalledWith({ where: { userId: 'u-001' }, data: { displayName: 'Bob' } });
  });

  it('softDelete sets deletedAt', async () => {
    d.update.mockResolvedValue(makeProfile({ deletedAt: NOW }));
    await repo.softDelete('u-001');
    expect(d.update).toHaveBeenCalledWith({ where: { userId: 'u-001' }, data: { deletedAt: expect.any(Date) } });
  });
});
