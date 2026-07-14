import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import {
  IUserRepository,
  USER_REPOSITORY,
} from './repositories/user.repository.interface';
import { UserResponseDto } from './dto/user-response.dto';
import type { User } from '@prisma/client';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'uuid-001',
  email: 'alice@example.com',
  emailVerified: false,
  status: UserStatus.ACTIVE,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mock repository
// ---------------------------------------------------------------------------

const mockRepo: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  findAll: jest.fn(),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USER_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and return a UserResponseDto when email is unique', async () => {
      const dto = { email: 'alice@example.com' };
      const user = makeUser();

      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(user);

      const result = await service.create(dto);

      expect(mockRepo.findByEmail).toHaveBeenCalledWith('alice@example.com');
      expect(mockRepo.create).toHaveBeenCalledWith({
        email: 'alice@example.com',
        emailVerified: undefined,
        status: undefined,
      });
      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.email).toBe('alice@example.com');
    });

    it('should throw ConflictException when email already exists', async () => {
      mockRepo.findByEmail.mockResolvedValue(makeUser());

      await expect(service.create({ email: 'alice@example.com' })).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return a paginated response with correct totalPages', async () => {
      const users = [makeUser(), makeUser({ id: 'uuid-002', email: 'bob@example.com' })];
      mockRepo.findAll.mockResolvedValue({ data: users, total: 2, page: 1, limit: 20 });

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should forward status filter to the repository', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.findAll({ status: UserStatus.INACTIVE });

      expect(mockRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.INACTIVE }),
      );
    });

    it('should default page=1 and limit=20 when not provided', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.findAll({});

      expect(mockRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return a UserResponseDto when user exists', async () => {
      mockRepo.findById.mockResolvedValue(makeUser());

      const result = await service.findById('uuid-001');

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.id).toBe('uuid-001');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByEmail ───────────────────────────────────────────────────────────

  describe('findByEmail', () => {
    it('should return a UserResponseDto when user exists', async () => {
      mockRepo.findByEmail.mockResolvedValue(makeUser());

      const result = await service.findByEmail('alice@example.com');

      expect(result).toBeInstanceOf(UserResponseDto);
    });

    it('should return null when user does not exist', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('ghost@example.com');

      expect(result).toBeNull();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return a UserResponseDto when user exists', async () => {
      const updated = makeUser({ email: 'updated@example.com' });
      mockRepo.findById.mockResolvedValue(makeUser());
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.update('uuid-001', { email: 'updated@example.com' });

      expect(mockRepo.update).toHaveBeenCalledWith('uuid-001', expect.objectContaining({
        email: 'updated@example.com',
      }));
      expect(result.email).toBe('updated@example.com');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.update('unknown', { email: 'x@x.com' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft-delete a user when they exist', async () => {
      mockRepo.findById.mockResolvedValue(makeUser());
      mockRepo.softDelete.mockResolvedValue(makeUser({ deletedAt: NOW }));

      await expect(service.remove('uuid-001')).resolves.toBeUndefined();
      expect(mockRepo.softDelete).toHaveBeenCalledWith('uuid-001');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.remove('unknown')).rejects.toThrow(NotFoundException);
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });
  });
});
