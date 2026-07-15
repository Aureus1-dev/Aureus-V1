import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { StewardCapacityService } from './steward-capacity.service';
import { STEWARD_CAPACITY_REPOSITORY, IStewardCapacityRepository } from './repositories/steward-capacity.repository.interface';
import type { StewardCapacity } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 'steward@example.com', roles: [UserRole.STEWARD] };
const OTHER_STEWARD: AuthenticatedUser = { id: 'steward-002', email: 'other@example.com', roles: [UserRole.STEWARD] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeCapacity = (o: Partial<StewardCapacity> = {}): StewardCapacity => ({
  id: 'cap-001', stewardId: STEWARD.id, maxActiveMembers: 25, updatedById: STEWARD.id,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IStewardCapacityRepository> = {
  findOrCreate: jest.fn(), update: jest.fn(),
};

describe('StewardCapacityService', () => {
  let service: StewardCapacityService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [StewardCapacityService, { provide: STEWARD_CAPACITY_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(StewardCapacityService);
    jest.clearAllMocks();
  });

  describe('findByStewardId', () => {
    it('allows a steward to view their own capacity', async () => {
      mockRepo.findOrCreate.mockResolvedValue(makeCapacity());
      const result = await service.findByStewardId(STEWARD.id, STEWARD);
      expect(result.maxActiveMembers).toBe(25);
    });

    it('allows an administrator to view any steward\'s capacity', async () => {
      mockRepo.findOrCreate.mockResolvedValue(makeCapacity());
      await service.findByStewardId(STEWARD.id, ADMIN);
      expect(mockRepo.findOrCreate).toHaveBeenCalledWith(STEWARD.id, ADMIN.id);
    });

    it('forbids a different steward from viewing another\'s capacity', async () => {
      await expect(service.findByStewardId(STEWARD.id, OTHER_STEWARD)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('allows an administrator to change the capacity', async () => {
      mockRepo.update.mockResolvedValue(makeCapacity({ maxActiveMembers: 40 }));
      const result = await service.update(STEWARD.id, 40, ADMIN);
      expect(result.maxActiveMembers).toBe(40);
    });

    it('forbids a steward from changing their own capacity', async () => {
      await expect(service.update(STEWARD.id, 40, STEWARD)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });
});
