import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademyContentStatus, LearningDomain, NotificationCategory, UserRole, VerificationStatus } from '@prisma/client';
import { CoursesService } from './courses.service';
import { COURSE_REPOSITORY, ICourseRepository } from './repositories/course.repository.interface';
import {
  COURSE_REVISION_REPOSITORY,
  ICourseRevisionRepository,
} from './repositories/course-revision.repository.interface';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../../organizations/repositories/organization.repository.interface';
import { NotificationsService } from '../../communication/notifications/notifications.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Course } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const AUTHOR: AuthenticatedUser = { id: 'author-001', email: 'author@example.com', roles: [UserRole.STEWARD] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-001', email: 'member@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeCourse = (o: Partial<Course> = {}): Course => ({
  id: 'course-001', sequenceNumber: 1, courseRef: 'AUR-CRS-000001',
  title: 'Financial Literacy Fundamentals', shortDescription: 'Learn the basics', fullDescription: 'A full walkthrough of financial literacy.',
  learningDomain: LearningDomain.FINANCIAL_LITERACY, estimatedDurationMinutes: 60,
  status: AcademyContentStatus.DRAFT, verificationStatus: VerificationStatus.DRAFT, rejectionReason: null,
  version: 1, grantsCertification: false, organizationId: null,
  authorId: AUTHOR.id, lastUpdatedById: AUTHOR.id,
  datePublished: null, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<ICourseRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(),
  findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockRevisionRepo: jest.Mocked<ICourseRevisionRepository> = {
  create: jest.fn(), findByCourse: jest.fn(),
};
const mockOrganizationRepo: jest.Mocked<Pick<IOrganizationRepository, 'findById'>> = {
  findById: jest.fn(),
};
const mockNotificationsService = { notify: jest.fn() } as unknown as NotificationsService;

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: COURSE_REPOSITORY, useValue: mockRepo },
        { provide: COURSE_REVISION_REPOSITORY, useValue: mockRevisionRepo },
        { provide: ORGANIZATION_REPOSITORY, useValue: mockOrganizationRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = m.get(CoursesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a course authored by the caller and sets its ref', async () => {
      const raw = makeCourse({ courseRef: null });
      mockRepo.create.mockResolvedValue(raw);
      mockRepo.setRef.mockResolvedValue({ ...raw, courseRef: 'AUR-CRS-000001' });

      const result = await service.create({
        title: 'Financial Literacy Fundamentals', shortDescription: 'Learn the basics',
        fullDescription: 'A full walkthrough of financial literacy.', learningDomain: LearningDomain.FINANCIAL_LITERACY,
      }, AUTHOR);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ authorId: AUTHOR.id, lastUpdatedById: AUTHOR.id }));
      expect(result.courseRef).toBe('AUR-CRS-000001');
    });

    it('validates organizationId exists when supplied', async () => {
      mockOrganizationRepo.findById.mockResolvedValue(null);
      await expect(service.create({
        title: 'x', shortDescription: 'y', fullDescription: 'z-full description here',
        learningDomain: LearningDomain.CAREER_READINESS, organizationId: 'org-ghost',
      }, AUTHOR)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('defaults to VERIFIED-only listing', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAll({ page: 1, limit: 20 });
      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ verificationStatus: VerificationStatus.VERIFIED }));
    });
  });

  describe('findById / findByRef', () => {
    it('throws NotFoundException for a missing course by id', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('ghost')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for a missing course by ref', async () => {
      mockRepo.findByRef.mockResolvedValue(null);
      await expect(service.findByRef('AUR-CRS-999999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update — authorization and revision tracking', () => {
    it('creates no revision for a non-substantive edit (grantsCertification only)', async () => {
      mockRepo.findById.mockResolvedValue(makeCourse());
      mockRepo.update.mockResolvedValue(makeCourse({ grantsCertification: true }));

      await service.update('course-001', { grantsCertification: true }, AUTHOR);

      expect(mockRevisionRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith('course-001', expect.objectContaining({ version: 1 }));
    });

    it('creates a revision snapshot and bumps version on a substantive edit (title/descriptions)', async () => {
      const existing = makeCourse();
      mockRepo.findById.mockResolvedValue(existing);
      mockRepo.update.mockResolvedValue(makeCourse({ title: 'Updated Title', version: 2 }));

      await service.update('course-001', { title: 'Updated Title' }, AUTHOR);

      expect(mockRevisionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        courseId: 'course-001', versionNumber: 1, title: existing.title, fullDescription: existing.fullDescription,
      }));
      expect(mockRepo.update).toHaveBeenCalledWith('course-001', expect.objectContaining({ version: 2 }));
    });

    it('forbids a non-author, non-privileged caller from updating', async () => {
      mockRepo.findById.mockResolvedValue(makeCourse());
      await expect(service.update('course-001', { title: 'x' }, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('allows an Administrator to update any course', async () => {
      mockRepo.findById.mockResolvedValue(makeCourse());
      mockRepo.update.mockResolvedValue(makeCourse());
      await expect(service.update('course-001', { estimatedDurationMinutes: 90 }, ADMIN)).resolves.toBeDefined();
    });

    it('validates organizationId exists when supplied on update', async () => {
      mockRepo.findById.mockResolvedValue(makeCourse());
      mockOrganizationRepo.findById.mockResolvedValue(null);
      await expect(service.update('course-001', { organizationId: 'org-ghost' }, AUTHOR)).rejects.toThrow(NotFoundException);
    });
  });

  describe('verification workflow', () => {
    it('submits DRAFT → PENDING_REVIEW', async () => {
      mockRepo.findById.mockResolvedValue(makeCourse());
      mockRepo.update.mockResolvedValue(makeCourse({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      const result = await service.submitForReview('course-001', AUTHOR);
      expect(result.verificationStatus).toBe(VerificationStatus.PENDING_REVIEW);
    });

    it('rejects submitting a non-DRAFT course', async () => {
      mockRepo.findById.mockResolvedValue(makeCourse({ verificationStatus: VerificationStatus.VERIFIED }));
      await expect(service.submitForReview('course-001', AUTHOR)).rejects.toThrow(ConflictException);
    });

    it('verifies PENDING_REVIEW → VERIFIED and notifies the author', async () => {
      const pending = makeCourse({ verificationStatus: VerificationStatus.PENDING_REVIEW });
      mockRepo.findById.mockResolvedValue(pending);
      mockRepo.update.mockResolvedValue(makeCourse({ verificationStatus: VerificationStatus.VERIFIED, status: AcademyContentStatus.ACTIVE }));

      const result = await service.verify('course-001', ADMIN);

      expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: AUTHOR.id, category: NotificationCategory.ACADEMY, type: 'academy.course.verified',
      }));
    });

    it('rejects verifying a non-PENDING_REVIEW course', async () => {
      mockRepo.findById.mockResolvedValue(makeCourse({ verificationStatus: VerificationStatus.DRAFT }));
      await expect(service.verify('course-001', ADMIN)).rejects.toThrow(ConflictException);
    });

    it('rejects PENDING_REVIEW → REJECTED with a reason and notifies the author', async () => {
      const pending = makeCourse({ verificationStatus: VerificationStatus.PENDING_REVIEW });
      mockRepo.findById.mockResolvedValue(pending);
      mockRepo.update.mockResolvedValue(makeCourse({ verificationStatus: VerificationStatus.REJECTED, rejectionReason: 'Needs more detail' }));

      const result = await service.reject('course-001', { rejectionReason: 'Needs more detail' }, ADMIN);

      expect(result.verificationStatus).toBe(VerificationStatus.REJECTED);
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: AUTHOR.id, category: NotificationCategory.ACADEMY, type: 'academy.course.rejected',
      }));
    });

    it('archives a course regardless of status', async () => {
      mockRepo.findById.mockResolvedValue(makeCourse({ verificationStatus: VerificationStatus.VERIFIED }));
      mockRepo.update.mockResolvedValue(makeCourse({ verificationStatus: VerificationStatus.ARCHIVED, status: AcademyContentStatus.ARCHIVED }));
      const result = await service.archive('course-001', AUTHOR);
      expect(result.status).toBe(AcademyContentStatus.ARCHIVED);
    });
  });

  describe('remove', () => {
    it('soft-deletes a course the caller authors', async () => {
      mockRepo.findById.mockResolvedValue(makeCourse());
      mockRepo.softDelete.mockResolvedValue(makeCourse({ deletedAt: NOW }));
      await expect(service.remove('course-001', AUTHOR)).resolves.toBeUndefined();
      expect(mockRepo.softDelete).toHaveBeenCalledWith('course-001');
    });

    it('forbids a non-author, non-privileged caller from deleting', async () => {
      mockRepo.findById.mockResolvedValue(makeCourse());
      await expect(service.remove('course-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getOwnedOrThrow', () => {
    it('is exposed for nested Module/Lesson services to reuse course-ownership checks', async () => {
      mockRepo.findById.mockResolvedValue(makeCourse());
      await expect(service.getOwnedOrThrow('course-001', AUTHOR)).resolves.toBeDefined();
    });
  });
});
