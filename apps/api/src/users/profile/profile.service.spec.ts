import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { IProfileRepository, PROFILE_REPOSITORY } from './repositories/profile.repository.interface';
import { ProfileResponseDto } from './dto/profile-response.dto';
import type { Profile } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeProfile = (o: Partial<Profile> = {}): Profile => ({
  id: 'p-001', userId: 'u-001', displayName: 'Alice', bio: null, avatarUrl: null,
  createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<IProfileRepository> = {
  create: jest.fn(), findByUserId: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(),
};

describe('ProfileService', () => {
  let service: ProfileService;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [ProfileService, { provide: PROFILE_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(ProfileService);
    jest.clearAllMocks();
  });

  describe('createOrGet', () => {
    it('creates profile when none exists', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeProfile());
      expect(await service.createOrGet('u-001', { displayName: 'Alice' })).toBeInstanceOf(ProfileResponseDto);
    });
    it('throws ConflictException when profile already exists', async () => {
      mockRepo.findByUserId.mockResolvedValue(makeProfile());
      await expect(service.createOrGet('u-001', {})).rejects.toThrow(ConflictException);
    });
  });

  describe('findByUserId', () => {
    it('returns profile', async () => {
      mockRepo.findByUserId.mockResolvedValue(makeProfile());
      expect(await service.findByUserId('u-001')).toBeInstanceOf(ProfileResponseDto);
    });
    it('throws NotFoundException', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);
      await expect(service.findByUserId('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates profile', async () => {
      mockRepo.findByUserId.mockResolvedValue(makeProfile());
      mockRepo.update.mockResolvedValue(makeProfile({ displayName: 'Bob' }));
      expect((await service.update('u-001', { displayName: 'Bob' })).displayName).toBe('Bob');
    });
    it('throws NotFoundException', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);
      await expect(service.update('x', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes profile', async () => {
      mockRepo.findByUserId.mockResolvedValue(makeProfile());
      mockRepo.softDelete.mockResolvedValue(makeProfile({ deletedAt: NOW }));
      await expect(service.remove('u-001')).resolves.toBeUndefined();
    });
    it('throws NotFoundException', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });
  });
});
