import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaUserRepository } from './prisma-user.repository';
import { PrismaService } from '../../prisma/prisma.service';
import type { User } from '@prisma/client';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'uuid-001',
  email: 'alice@example.com',
  emailVerified: false,
  passwordHash: null,
  roles: [UserRole.MEMBER],
  status: UserStatus.ACTIVE,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mock Prisma DB delegate
// ---------------------------------------------------------------------------

const userDelegate = {
  create: jest.fn(),
  findFirst: jest.fn(),
  update: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
};

const mockPrismaService = {
  db: { user: userDelegate },
} as unknown as PrismaService;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PrismaUserRepository', () => {
  let repo: PrismaUserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaUserRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repo = module.get<PrismaUserRepository>(PrismaUserRepository);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should call prisma.db.user.create with the provided data', async () => {
      const user = makeUser();
      userDelegate.create.mockResolvedValue(user);

      const input = { email: 'alice@example.com' };
      const result = await repo.create(input);

      expect(userDelegate.create).toHaveBeenCalledWith({ data: input });
      expect(result).toEqual(user);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should query with id and deletedAt: null', async () => {
      const user = makeUser();
      userDelegate.findFirst.mockResolvedValue(user);

      const result = await repo.findById('uuid-001');

      expect(userDelegate.findFirst).toHaveBeenCalledWith({
        where: { id: 'uuid-001', deletedAt: null },
      });
      expect(result).toEqual(user);
    });

    it('should return null when no user matches', async () => {
      userDelegate.findFirst.mockResolvedValue(null);

      const result = await repo.findById('unknown');

      expect(result).toBeNull();
    });
  });

  // ── findByEmail ───────────────────────────────────────────────────────────

  describe('findByEmail', () => {
    it('should query with email and deletedAt: null', async () => {
      const user = makeUser();
      userDelegate.findFirst.mockResolvedValue(user);

      const result = await repo.findByEmail('alice@example.com');

      expect(userDelegate.findFirst).toHaveBeenCalledWith({
        where: { email: 'alice@example.com', deletedAt: null },
      });
      expect(result).toEqual(user);
    });

    it('should return null when email not found', async () => {
      userDelegate.findFirst.mockResolvedValue(null);

      expect(await repo.findByEmail('ghost@example.com')).toBeNull();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should call prisma.db.user.update with correct where and data', async () => {
      const updated = makeUser({ email: 'new@example.com' });
      userDelegate.update.mockResolvedValue(updated);

      const result = await repo.update('uuid-001', { email: 'new@example.com' });

      expect(userDelegate.update).toHaveBeenCalledWith({
        where: { id: 'uuid-001' },
        data: { email: 'new@example.com' },
      });
      expect(result.email).toBe('new@example.com');
    });
  });

  // ── softDelete ────────────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('should set deletedAt to a Date instance', async () => {
      const deleted = makeUser({ deletedAt: NOW });
      userDelegate.update.mockResolvedValue(deleted);

      const result = await repo.softDelete('uuid-001');

      expect(userDelegate.update).toHaveBeenCalledWith({
        where: { id: 'uuid-001' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.deletedAt).toBeInstanceOf(Date);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should calculate correct skip from page and limit', async () => {
      userDelegate.findMany.mockResolvedValue([]);
      userDelegate.count.mockResolvedValue(0);

      await repo.findAll({ page: 3, limit: 10 });

      expect(userDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should always include deletedAt: null in the where clause', async () => {
      userDelegate.findMany.mockResolvedValue([]);
      userDelegate.count.mockResolvedValue(0);

      await repo.findAll({ page: 1, limit: 20 });

      expect(userDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
      );
    });

    it('should forward an optional status filter', async () => {
      userDelegate.findMany.mockResolvedValue([]);
      userDelegate.count.mockResolvedValue(0);

      await repo.findAll({ page: 1, limit: 20, status: UserStatus.INACTIVE });

      expect(userDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: UserStatus.INACTIVE }),
        }),
      );
    });

    it('should return a PaginatedResult with correct shape', async () => {
      const users = [makeUser()];
      userDelegate.findMany.mockResolvedValue(users);
      userDelegate.count.mockResolvedValue(1);

      const result = await repo.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({
        data: users,
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('should run findMany and count concurrently', async () => {
      userDelegate.findMany.mockResolvedValue([]);
      userDelegate.count.mockResolvedValue(0);

      await repo.findAll({ page: 1, limit: 5 });

      expect(userDelegate.findMany).toHaveBeenCalledTimes(1);
      expect(userDelegate.count).toHaveBeenCalledTimes(1);
    });
  });
});
