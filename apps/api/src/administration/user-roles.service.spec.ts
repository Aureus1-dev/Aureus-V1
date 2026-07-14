import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { UserRolesService } from './user-roles.service';
import { IUserRepository, USER_REPOSITORY } from '../users/repositories/user.repository.interface';
import type { User } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const PLATFORM_ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };
const SYSTEM_ADMIN: AuthenticatedUser = { id: 'sysadmin-001', email: 'sysadmin@example.com', roles: [UserRole.SYSTEM_ADMINISTRATOR] };

const makeUser = (o: Partial<User> = {}): User => ({
  id: 'target-001',
  email: 'target@example.com',
  emailVerified: false,
  passwordHash: null,
  roles: [UserRole.MEMBER],
  status: UserStatus.ACTIVE,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
  ...o,
});

const mockRepo: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  findAll: jest.fn(),
};

describe('UserRolesService', () => {
  let service: UserRolesService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [UserRolesService, { provide: USER_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(UserRolesService);
    jest.clearAllMocks();
  });

  // ── grant ─────────────────────────────────────────────────────────────

  describe('grant', () => {
    it('adds a role a Platform Administrator is permitted to grant', async () => {
      mockRepo.findById.mockResolvedValue(makeUser());
      mockRepo.update.mockResolvedValue(makeUser({ roles: [UserRole.MEMBER, UserRole.STEWARD] }));

      const result = await service.grant('target-001', UserRole.STEWARD, PLATFORM_ADMIN);

      expect(mockRepo.update).toHaveBeenCalledWith('target-001', {
        roles: [UserRole.MEMBER, UserRole.STEWARD],
      });
      expect(result.roles).toEqual([UserRole.MEMBER, UserRole.STEWARD]);
    });

    it('rejects granting MEMBER (protected baseline role)', async () => {
      await expect(service.grant('target-001', UserRole.MEMBER, PLATFORM_ADMIN))
        .rejects.toThrow(ConflictException);
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    it('rejects a caller granting a role to themselves', async () => {
      await expect(service.grant(PLATFORM_ADMIN.id, UserRole.STEWARD, PLATFORM_ADMIN))
        .rejects.toThrow(ForbiddenException);
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    it('rejects a Platform Administrator granting a System-Administrator-only role', async () => {
      await expect(service.grant('target-001', UserRole.PLATFORM_ADMINISTRATOR, PLATFORM_ADMIN))
        .rejects.toThrow(ForbiddenException);
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    it('allows a System Administrator to grant PLATFORM_ADMINISTRATOR', async () => {
      mockRepo.findById.mockResolvedValue(makeUser());
      mockRepo.update.mockResolvedValue(makeUser({ roles: [UserRole.MEMBER, UserRole.PLATFORM_ADMINISTRATOR] }));

      const result = await service.grant('target-001', UserRole.PLATFORM_ADMINISTRATOR, SYSTEM_ADMIN);

      expect(result.roles).toContain(UserRole.PLATFORM_ADMINISTRATOR);
    });

    it('throws NotFoundException for a missing user', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.grant('missing', UserRole.STEWARD, PLATFORM_ADMIN))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the user already holds the role', async () => {
      mockRepo.findById.mockResolvedValue(makeUser({ roles: [UserRole.MEMBER, UserRole.STEWARD] }));
      await expect(service.grant('target-001', UserRole.STEWARD, PLATFORM_ADMIN))
        .rejects.toThrow(ConflictException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── revoke ────────────────────────────────────────────────────────────

  describe('revoke', () => {
    it('removes a role the user holds', async () => {
      mockRepo.findById.mockResolvedValue(makeUser({ roles: [UserRole.MEMBER, UserRole.STEWARD] }));
      mockRepo.update.mockResolvedValue(makeUser({ roles: [UserRole.MEMBER] }));

      const result = await service.revoke('target-001', UserRole.STEWARD, PLATFORM_ADMIN);

      expect(mockRepo.update).toHaveBeenCalledWith('target-001', { roles: [UserRole.MEMBER] });
      expect(result.roles).toEqual([UserRole.MEMBER]);
    });

    it('rejects revoking MEMBER (protected baseline role)', async () => {
      await expect(service.revoke('target-001', UserRole.MEMBER, PLATFORM_ADMIN))
        .rejects.toThrow(ConflictException);
    });

    it('rejects a caller revoking their own role', async () => {
      await expect(service.revoke(PLATFORM_ADMIN.id, UserRole.STEWARD, PLATFORM_ADMIN))
        .rejects.toThrow(ForbiddenException);
    });

    it('rejects a Platform Administrator revoking a System-Administrator-only role', async () => {
      await expect(service.revoke('target-001', UserRole.SYSTEM_ADMINISTRATOR, PLATFORM_ADMIN))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when the user does not hold the role', async () => {
      mockRepo.findById.mockResolvedValue(makeUser({ roles: [UserRole.MEMBER] }));
      await expect(service.revoke('target-001', UserRole.STEWARD, PLATFORM_ADMIN))
        .rejects.toThrow(ConflictException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when revoking would leave the user with zero roles', async () => {
      mockRepo.findById.mockResolvedValue(makeUser({ roles: [UserRole.STEWARD] }));
      await expect(service.revoke('target-001', UserRole.STEWARD, PLATFORM_ADMIN))
        .rejects.toThrow(ConflictException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a missing user', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.revoke('missing', UserRole.STEWARD, PLATFORM_ADMIN))
        .rejects.toThrow(NotFoundException);
    });
  });
});
