import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MediaType, UserRole } from '@prisma/client';
import { MediaAssetsService } from './media-assets.service';
import { MEDIA_ASSET_REPOSITORY, IMediaAssetRepository } from './repositories/media-asset.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { MediaAsset } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const UPLOADER: AuthenticatedUser = { id: 'steward-001', email: 'steward@example.com', roles: [UserRole.STEWARD] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-001', email: 'member@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeAsset = (o: Partial<MediaAsset> = {}): MediaAsset => ({
  id: 'media-001', sequenceNumber: 1, mediaRef: 'AUR-MED-000001',
  type: MediaType.VIDEO, title: 'Intro Video', description: null, storageRef: 's3://bucket/key',
  mimeType: 'video/mp4', sizeBytes: 1000, durationSeconds: 120,
  uploadedById: UPLOADER.id, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<IMediaAssetRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(),
  findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};

describe('MediaAssetsService', () => {
  let service: MediaAssetsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [MediaAssetsService, { provide: MEDIA_ASSET_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(MediaAssetsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a media asset uploaded by the caller and sets its ref', async () => {
      const raw = makeAsset({ mediaRef: null });
      mockRepo.create.mockResolvedValue(raw);
      mockRepo.setRef.mockResolvedValue({ ...raw, mediaRef: 'AUR-MED-000001' });

      const result = await service.create({
        type: MediaType.VIDEO, title: 'Intro Video', storageRef: 's3://bucket/key',
      }, UPLOADER);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ uploadedById: UPLOADER.id }));
      expect(result.mediaRef).toBe('AUR-MED-000001');
    });
  });

  describe('update / remove — ownership', () => {
    it('allows the uploader to update', async () => {
      mockRepo.findById.mockResolvedValue(makeAsset());
      mockRepo.update.mockResolvedValue(makeAsset({ title: 'Updated' }));
      await expect(service.update('media-001', { title: 'Updated' }, UPLOADER)).resolves.toBeDefined();
    });

    it('allows an Administrator to manage any asset', async () => {
      mockRepo.findById.mockResolvedValue(makeAsset());
      mockRepo.softDelete.mockResolvedValue(makeAsset({ deletedAt: NOW }));
      await expect(service.remove('media-001', ADMIN)).resolves.toBeUndefined();
    });

    it('forbids a non-uploader, non-privileged caller', async () => {
      mockRepo.findById.mockResolvedValue(makeAsset());
      await expect(service.update('media-001', { title: 'x' }, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing asset', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
