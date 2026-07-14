import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SavedResourcesService } from './saved-resources.service';
import { ISavedResourceRepository, SAVED_RESOURCE_REPOSITORY } from './repositories/saved-resource.repository.interface';
import type { SavedResource } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeSaved = (o: Partial<SavedResource> = {}): SavedResource => ({
  id: 'sr-001', userId: 'u-001', resourceId: 'res-001',
  isFavorite: false, notes: null, savedAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<ISavedResourceRepository> = {
  save: jest.fn(), findByUser: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn(),
};

describe('SavedResourcesService', () => {
  let service: SavedResourcesService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [SavedResourcesService, { provide: SAVED_RESOURCE_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(SavedResourcesService);
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('saves a new resource for a user', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue(makeSaved());

      const result = await service.save('u-001', { resourceId: 'res-001' });
      expect(result.resourceId).toBe('res-001');
    });

    it('throws ConflictException when already saved', async () => {
      mockRepo.findOne.mockResolvedValue(makeSaved());
      await expect(service.save('u-001', { resourceId: 'res-001' })).rejects.toThrow(ConflictException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('returns the mapped list', async () => {
      mockRepo.findByUser.mockResolvedValue([makeSaved()]);
      const result = await service.findByUser('u-001');
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('updates an existing saved resource', async () => {
      mockRepo.findOne.mockResolvedValue(makeSaved());
      mockRepo.update.mockResolvedValue(makeSaved({ isFavorite: true }));

      const result = await service.update('u-001', 'res-001', { isFavorite: true });
      expect(result.isFavorite).toBe(true);
    });

    it('throws NotFoundException when not saved', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update('u-001', 'res-001', { isFavorite: true })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes an existing saved resource', async () => {
      mockRepo.findOne.mockResolvedValue(makeSaved());
      await expect(service.remove('u-001', 'res-001')).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith('u-001', 'res-001');
    });

    it('throws NotFoundException when not saved', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('u-001', 'res-001')).rejects.toThrow(NotFoundException);
    });
  });
});
