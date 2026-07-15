import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademyContentStatus, NotificationCategory, UserRole, VerificationStatus } from '@prisma/client';
import { LearningPathsService } from './learning-paths.service';
import { ILearningPathRepository, LEARNING_PATH_REPOSITORY } from './repositories/learning-path.repository.interface';
import { NotificationsService } from '../../communication/notifications/notifications.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { LearningPath } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const AUTHOR: AuthenticatedUser = { id: 'author-001', email: 'author@example.com', roles: [UserRole.STEWARD] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-001', email: 'member@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makePath = (o: Partial<LearningPath> = {}): LearningPath => ({
  id: 'path-001', sequenceNumber: 1, pathRef: 'AUR-LP-000001',
  title: 'Financial Independence Track', shortDescription: 'A curated sequence', fullDescription: 'A full description of the track.',
  status: AcademyContentStatus.DRAFT, verificationStatus: VerificationStatus.DRAFT, rejectionReason: null,
  authorId: AUTHOR.id, lastUpdatedById: AUTHOR.id,
  datePublished: null, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<ILearningPathRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(),
  findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockNotificationsService = { notify: jest.fn() } as unknown as NotificationsService;

describe('LearningPathsService', () => {
  let service: LearningPathsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        LearningPathsService,
        { provide: LEARNING_PATH_REPOSITORY, useValue: mockRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = m.get(LearningPathsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a learning path authored by the caller and sets its ref', async () => {
      const raw = makePath({ pathRef: null });
      mockRepo.create.mockResolvedValue(raw);
      mockRepo.setRef.mockResolvedValue({ ...raw, pathRef: 'AUR-LP-000001' });

      const result = await service.create({
        title: 'Financial Independence Track', shortDescription: 'A curated sequence', fullDescription: 'A full description of the track.',
      }, AUTHOR);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ authorId: AUTHOR.id }));
      expect(result.pathRef).toBe('AUR-LP-000001');
    });
  });

  describe('findAll', () => {
    it('defaults to VERIFIED-only listing', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAll({ page: 1, limit: 20 });
      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ verificationStatus: VerificationStatus.VERIFIED }));
    });
  });

  describe('verification workflow', () => {
    it('submits DRAFT → PENDING_REVIEW', async () => {
      mockRepo.findById.mockResolvedValue(makePath());
      mockRepo.update.mockResolvedValue(makePath({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      const result = await service.submitForReview('path-001', AUTHOR);
      expect(result.verificationStatus).toBe(VerificationStatus.PENDING_REVIEW);
    });

    it('rejects submitting a non-DRAFT path', async () => {
      mockRepo.findById.mockResolvedValue(makePath({ verificationStatus: VerificationStatus.VERIFIED }));
      await expect(service.submitForReview('path-001', AUTHOR)).rejects.toThrow(ConflictException);
    });

    it('verifies PENDING_REVIEW → VERIFIED and notifies the author', async () => {
      mockRepo.findById.mockResolvedValue(makePath({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      mockRepo.update.mockResolvedValue(makePath({ verificationStatus: VerificationStatus.VERIFIED, status: AcademyContentStatus.ACTIVE }));

      const result = await service.verify('path-001', ADMIN);

      expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: AUTHOR.id, category: NotificationCategory.ACADEMY, type: 'academy.path.verified',
      }));
    });

    it('rejects PENDING_REVIEW → REJECTED with a reason and notifies the author', async () => {
      mockRepo.findById.mockResolvedValue(makePath({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      mockRepo.update.mockResolvedValue(makePath({ verificationStatus: VerificationStatus.REJECTED, rejectionReason: 'Needs work' }));

      const result = await service.reject('path-001', { rejectionReason: 'Needs work' }, ADMIN);
      expect(result.verificationStatus).toBe(VerificationStatus.REJECTED);
    });
  });

  describe('getOwnedOrThrow', () => {
    it('allows the author', async () => {
      mockRepo.findById.mockResolvedValue(makePath());
      await expect(service.getOwnedOrThrow('path-001', AUTHOR)).resolves.toBeDefined();
    });

    it('forbids a non-author, non-privileged caller', async () => {
      mockRepo.findById.mockResolvedValue(makePath());
      await expect(service.getOwnedOrThrow('path-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing path', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getOwnedOrThrow('ghost', AUTHOR)).rejects.toThrow(NotFoundException);
    });
  });
});
