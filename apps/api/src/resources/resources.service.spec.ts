import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  ResourceCategory, ResourceStatus, ResourceType, SourceType, UserRole, VerificationStatus,
} from '@prisma/client';
import { ResourcesService } from './resources.service';
import { RESOURCE_REPOSITORY, IResourceRepository } from './repositories/resource.repository.interface';
import { ResourceScoringService } from './scoring/resource-scoring.service';
import type { Resource } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const OWNER: AuthenticatedUser = { id: 'owner-001', email: 'owner@example.com', roles: [UserRole.ORGANIZATION_REPRESENTATIVE] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-001', email: 'member@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 'steward@example.com', roles: [UserRole.STEWARD] };

const makeResource = (o: Partial<Resource> = {}): Resource => ({
  id: 'res-uuid', sequenceNumber: 1, resourceRef: 'AUR-RES-000001',
  title: 'Legal Aid Society', shortDescription: 'Free legal help', fullDescription: 'Full details here',
  category: ResourceCategory.LEGAL_SERVICES, resourceType: ResourceType.ORGANIZATION, tags: ['free'],
  organizationName: 'Legal Aid Society', officialSourceUrl: 'https://legalaid.example.org',
  contactName: null, contactEmail: null, contactPhone: null,
  location: null, country: null, state: null, city: null, isRemote: false,
  eligibilityNotes: null,
  status: ResourceStatus.DRAFT, verificationStatus: VerificationStatus.DRAFT, rejectionReason: null,
  confidenceScore: 40, freshnessScore: 0, datePublished: null, dateLastVerified: null,
  sourceName: 'Legal Aid Society', sourceUrl: null, sourceType: SourceType.ORGANIZATION_SUBMISSION,
  ownerId: OWNER.id, submittedById: OWNER.id, createdById: OWNER.id, lastUpdatedById: OWNER.id,
  createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<IResourceRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(),
  findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};

describe('ResourcesService', () => {
  let service: ResourcesService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        ResourcesService, ResourceScoringService,
        { provide: RESOURCE_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();
    service = m.get(ResourcesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a resource owned by the caller, sets ref, returns DTO', async () => {
      const raw = makeResource({ resourceRef: null, sequenceNumber: 1 });
      mockRepo.create.mockResolvedValue(raw);
      mockRepo.setRef.mockResolvedValue({ ...raw, resourceRef: 'AUR-RES-000001' });

      const result = await service.create({
        title: 'Legal Aid Society', shortDescription: 'S', fullDescription: 'F',
        category: ResourceCategory.LEGAL_SERVICES, resourceType: ResourceType.ORGANIZATION,
        organizationName: 'Legal Aid Society', officialSourceUrl: 'https://legalaid.example.org',
        sourceName: 'Legal Aid Society',
      }, OWNER);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: OWNER.id, submittedById: OWNER.id, createdById: OWNER.id }),
      );
      expect(result.resourceRef).toBe('AUR-RES-000001');
    });
  });

  describe('findAll', () => {
    it('defaults to VERIFIED-only listing', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.findAll({ page: 1, limit: 20 });

      expect(mockRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ verificationStatus: VerificationStatus.VERIFIED }),
      );
    });

    it('computes totalPages correctly', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [makeResource()], total: 21, page: 1, limit: 20 });

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.totalPages).toBe(2);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when missing', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update — organization ownership', () => {
    it('allows the owner to update their own resource', async () => {
      mockRepo.findById.mockResolvedValue(makeResource());
      mockRepo.update.mockResolvedValue(makeResource({ title: 'Updated' }));

      const result = await service.update('res-uuid', { title: 'Updated' }, OWNER);

      expect(result.title).toBe('Updated');
      expect(mockRepo.update).toHaveBeenCalledWith('res-uuid', expect.objectContaining({
        lastUpdatedById: OWNER.id,
      }));
    });

    it('forbids a non-owner member from updating', async () => {
      mockRepo.findById.mockResolvedValue(makeResource());

      await expect(service.update('res-uuid', { title: 'Hijacked' }, OTHER_MEMBER))
        .rejects.toThrow(ForbiddenException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('allows a Steward to update any resource regardless of ownership', async () => {
      mockRepo.findById.mockResolvedValue(makeResource());
      mockRepo.update.mockResolvedValue(makeResource({ title: 'Moderated' }));

      const result = await service.update('res-uuid', { title: 'Moderated' }, STEWARD);

      expect(result.title).toBe('Moderated');
    });

    it('throws NotFoundException for a missing resource', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('missing', {}, OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove — organization ownership', () => {
    it('allows the owner to soft-delete', async () => {
      mockRepo.findById.mockResolvedValue(makeResource());
      mockRepo.softDelete.mockResolvedValue(makeResource({ deletedAt: NOW }));

      await expect(service.remove('res-uuid', OWNER)).resolves.toBeUndefined();
      expect(mockRepo.softDelete).toHaveBeenCalledWith('res-uuid');
    });

    it('forbids a non-owner, non-privileged caller', async () => {
      mockRepo.findById.mockResolvedValue(makeResource());
      await expect(service.remove('res-uuid', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verification workflow', () => {
    it('submitForReview moves DRAFT → PENDING_REVIEW for the owner', async () => {
      mockRepo.findById.mockResolvedValue(makeResource());
      mockRepo.update.mockResolvedValue(makeResource({ verificationStatus: VerificationStatus.PENDING_REVIEW }));

      const result = await service.submitForReview('res-uuid', OWNER);
      expect(result.verificationStatus).toBe(VerificationStatus.PENDING_REVIEW);
    });

    it('submitForReview rejects a non-owner', async () => {
      mockRepo.findById.mockResolvedValue(makeResource());
      await expect(service.submitForReview('res-uuid', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('submitForReview throws ConflictException outside DRAFT', async () => {
      mockRepo.findById.mockResolvedValue(makeResource({ verificationStatus: VerificationStatus.VERIFIED }));
      await expect(service.submitForReview('res-uuid', OWNER)).rejects.toThrow(ConflictException);
    });

    it('verify moves PENDING_REVIEW → VERIFIED and sets ACTIVE status', async () => {
      mockRepo.findById.mockResolvedValue(makeResource({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      mockRepo.update.mockResolvedValue(makeResource({
        verificationStatus: VerificationStatus.VERIFIED, status: ResourceStatus.ACTIVE,
      }));

      const result = await service.verify('res-uuid', STEWARD);
      expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(result.status).toBe(ResourceStatus.ACTIVE);
    });

    it('verify throws ConflictException outside PENDING_REVIEW', async () => {
      mockRepo.findById.mockResolvedValue(makeResource({ verificationStatus: VerificationStatus.DRAFT }));
      await expect(service.verify('res-uuid', STEWARD)).rejects.toThrow(ConflictException);
    });

    it('reject moves PENDING_REVIEW → REJECTED with a reason', async () => {
      mockRepo.findById.mockResolvedValue(makeResource({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      mockRepo.update.mockResolvedValue(makeResource({
        verificationStatus: VerificationStatus.REJECTED, rejectionReason: 'Broken link',
      }));

      const result = await service.reject('res-uuid', { rejectionReason: 'Broken link' }, STEWARD);
      expect(result.verificationStatus).toBe(VerificationStatus.REJECTED);
      expect(result.rejectionReason).toBe('Broken link');
    });

    it('archive is allowed for the owner from any status', async () => {
      mockRepo.findById.mockResolvedValue(makeResource({ verificationStatus: VerificationStatus.VERIFIED }));
      mockRepo.update.mockResolvedValue(makeResource({
        verificationStatus: VerificationStatus.ARCHIVED, status: ResourceStatus.ARCHIVED,
      }));

      const result = await service.archive('res-uuid', OWNER);
      expect(result.status).toBe(ResourceStatus.ARCHIVED);
    });

    it('archive rejects a non-owner, non-privileged caller', async () => {
      mockRepo.findById.mockResolvedValue(makeResource());
      await expect(service.archive('res-uuid', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });
});
