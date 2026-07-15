import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CertificationsService } from './certifications.service';
import { CERTIFICATION_REPOSITORY, ICertificationRepository } from './repositories/certification.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Certification } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const LEARNER: AuthenticatedUser = { id: 'learner-001', email: 'learner@example.com', roles: [UserRole.MEMBER] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'other-001', email: 'other@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeCertification = (o: Partial<Certification> = {}): Certification => ({
  id: 'cert-001', sequenceNumber: 1, userId: LEARNER.id, courseId: 'course-001',
  certificateRef: 'AUR-CERT-000001', issuedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<ICertificationRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByUserAndCourse: jest.fn(), findByUser: jest.fn(),
};

describe('CertificationsService', () => {
  let service: CertificationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [CertificationsService, { provide: CERTIFICATION_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(CertificationsService);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('allows the certification holder', async () => {
      mockRepo.findById.mockResolvedValue(makeCertification());
      await expect(service.findById('cert-001', LEARNER)).resolves.toBeDefined();
    });

    it('allows an Administrator', async () => {
      mockRepo.findById.mockResolvedValue(makeCertification());
      await expect(service.findById('cert-001', ADMIN)).resolves.toBeDefined();
    });

    it('forbids a non-holder, non-privileged caller', async () => {
      mockRepo.findById.mockResolvedValue(makeCertification());
      await expect(service.findById('cert-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing certification', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('ghost', LEARNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMine', () => {
    it('returns the caller\'s certifications', async () => {
      mockRepo.findByUser.mockResolvedValue([makeCertification()]);
      const result = await service.findMine(LEARNER);
      expect(result).toHaveLength(1);
    });
  });
});
