import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AcademyContentStatus, EnrollmentStatus, LearningDomain, LessonProgressStatus,
  NotificationCategory, UserRole, VerificationStatus,
} from '@prisma/client';
import { EnrollmentsService } from './enrollments.service';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from './repositories/enrollment.repository.interface';
import { ILessonProgressRepository, LESSON_PROGRESS_REPOSITORY } from './repositories/lesson-progress.repository.interface';
import { CERTIFICATION_REPOSITORY, ICertificationRepository } from './repositories/certification.repository.interface';
import { COURSE_REPOSITORY, ICourseRepository } from '../courses/repositories/course.repository.interface';
import { ILessonRepository, LESSON_REPOSITORY } from '../courses/repositories/lesson.repository.interface';
import { IModuleRepository, MODULE_REPOSITORY } from '../courses/repositories/module.repository.interface';
import { NotificationsService } from '../../communication/notifications/notifications.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Course, Enrollment, Lesson, Module as ModuleModel } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const LEARNER: AuthenticatedUser = { id: 'learner-001', email: 'learner@example.com', roles: [UserRole.MEMBER] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'other-001', email: 'other@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeCourse = (o: Partial<Course> = {}): Course => ({
  id: 'course-001', sequenceNumber: 1, courseRef: 'AUR-CRS-000001',
  title: 'Course', shortDescription: 'x', fullDescription: 'y full description here',
  learningDomain: LearningDomain.CAREER_READINESS, estimatedDurationMinutes: null,
  status: AcademyContentStatus.ACTIVE, verificationStatus: VerificationStatus.VERIFIED, rejectionReason: null,
  version: 1, grantsCertification: true, organizationId: null,
  authorId: 'author-001', lastUpdatedById: 'author-001',
  datePublished: NOW, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeEnrollment = (o: Partial<Enrollment> = {}): Enrollment => ({
  id: 'enrollment-001', userId: LEARNER.id, courseId: 'course-001', status: EnrollmentStatus.ACTIVE,
  enrolledAt: NOW, completedAt: null, updatedAt: NOW, ...o,
});

const makeLesson = (o: Partial<Lesson> = {}): Lesson => ({
  id: 'lesson-001', moduleId: 'module-001', title: 'Lesson', content: 'x', position: 0,
  estimatedDurationMinutes: null, relatedArticleId: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeModule = (o: Partial<ModuleModel> = {}): ModuleModel => ({
  id: 'module-001', courseId: 'course-001', title: 'Module', description: null, position: 0,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const mockEnrollmentRepo: jest.Mocked<IEnrollmentRepository> = {
  create: jest.fn(), findById: jest.fn(), findByUserAndCourse: jest.fn(), findByUser: jest.fn(), update: jest.fn(),
};
const mockProgressRepo: jest.Mocked<ILessonProgressRepository> = {
  upsert: jest.fn(), findByEnrollment: jest.fn(), findByEnrollmentAndLesson: jest.fn(), countCompletedByEnrollment: jest.fn(),
};
const mockCertificationRepo: jest.Mocked<ICertificationRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByUserAndCourse: jest.fn(), findByUser: jest.fn(),
};
const mockCourseRepo: jest.Mocked<Pick<ICourseRepository, 'findById'>> = { findById: jest.fn() };
const mockLessonRepo: jest.Mocked<Pick<ILessonRepository, 'findById' | 'findByCourse'>> = { findById: jest.fn(), findByCourse: jest.fn() };
const mockModuleRepo: jest.Mocked<Pick<IModuleRepository, 'findById'>> = { findById: jest.fn() };
const mockNotificationsService = { notify: jest.fn() } as unknown as NotificationsService;

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: ENROLLMENT_REPOSITORY, useValue: mockEnrollmentRepo },
        { provide: LESSON_PROGRESS_REPOSITORY, useValue: mockProgressRepo },
        { provide: CERTIFICATION_REPOSITORY, useValue: mockCertificationRepo },
        { provide: COURSE_REPOSITORY, useValue: mockCourseRepo },
        { provide: LESSON_REPOSITORY, useValue: mockLessonRepo },
        { provide: MODULE_REPOSITORY, useValue: mockModuleRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = m.get(EnrollmentsService);
    jest.clearAllMocks();
  });

  describe('enroll', () => {
    it('enrolls the caller in an existing course', async () => {
      mockCourseRepo.findById.mockResolvedValue(makeCourse());
      mockEnrollmentRepo.findByUserAndCourse.mockResolvedValue(null);
      mockEnrollmentRepo.create.mockResolvedValue(makeEnrollment());

      const result = await service.enroll('course-001', LEARNER);
      expect(result.userId).toBe(LEARNER.id);
      expect(mockEnrollmentRepo.create).toHaveBeenCalledWith({ userId: LEARNER.id, courseId: 'course-001' });
    });

    it('throws NotFoundException for a missing course', async () => {
      mockCourseRepo.findById.mockResolvedValue(null);
      await expect(service.enroll('ghost', LEARNER)).rejects.toThrow(NotFoundException);
    });

    it('rejects a duplicate enrollment', async () => {
      mockCourseRepo.findById.mockResolvedValue(makeCourse());
      mockEnrollmentRepo.findByUserAndCourse.mockResolvedValue(makeEnrollment());
      await expect(service.enroll('course-001', LEARNER)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById / access control', () => {
    it('forbids a non-owner, non-privileged caller', async () => {
      mockEnrollmentRepo.findById.mockResolvedValue(makeEnrollment());
      await expect(service.findById('enrollment-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('allows an Administrator to view any enrollment', async () => {
      mockEnrollmentRepo.findById.mockResolvedValue(makeEnrollment());
      await expect(service.findById('enrollment-001', ADMIN)).resolves.toBeDefined();
    });
  });

  describe('updateLessonProgress — auto-completion and certification', () => {
    it('updates progress without completing the course when lessons remain', async () => {
      mockEnrollmentRepo.findById.mockResolvedValue(makeEnrollment());
      mockLessonRepo.findById.mockResolvedValue(makeLesson());
      mockModuleRepo.findById.mockResolvedValue(makeModule());
      mockProgressRepo.findByEnrollmentAndLesson.mockResolvedValue(null);
      mockProgressRepo.upsert.mockResolvedValue({
        id: 'progress-001', enrollmentId: 'enrollment-001', lessonId: 'lesson-001',
        status: LessonProgressStatus.COMPLETED, startedAt: NOW, completedAt: NOW, updatedAt: NOW,
      });
      mockLessonRepo.findByCourse.mockResolvedValue([makeLesson(), makeLesson({ id: 'lesson-002' })]);
      mockProgressRepo.countCompletedByEnrollment.mockResolvedValue(1);

      await service.updateLessonProgress('enrollment-001', 'lesson-001', { status: LessonProgressStatus.COMPLETED }, LEARNER);

      expect(mockEnrollmentRepo.update).not.toHaveBeenCalled();
    });

    it('rejects a lesson that does not belong to the enrollment\'s course', async () => {
      mockEnrollmentRepo.findById.mockResolvedValue(makeEnrollment());
      mockLessonRepo.findById.mockResolvedValue(makeLesson());
      mockModuleRepo.findById.mockResolvedValue(makeModule({ courseId: 'other-course' }));

      await expect(service.updateLessonProgress(
        'enrollment-001', 'lesson-001', { status: LessonProgressStatus.IN_PROGRESS }, LEARNER,
      )).rejects.toThrow(NotFoundException);
    });

    it('auto-completes the enrollment and issues a certification when the last lesson completes', async () => {
      mockEnrollmentRepo.findById.mockResolvedValue(makeEnrollment());
      mockLessonRepo.findById.mockResolvedValue(makeLesson());
      mockModuleRepo.findById.mockResolvedValue(makeModule());
      mockProgressRepo.findByEnrollmentAndLesson.mockResolvedValue(null);
      mockProgressRepo.upsert.mockResolvedValue({
        id: 'progress-001', enrollmentId: 'enrollment-001', lessonId: 'lesson-001',
        status: LessonProgressStatus.COMPLETED, startedAt: NOW, completedAt: NOW, updatedAt: NOW,
      });
      mockLessonRepo.findByCourse.mockResolvedValue([makeLesson()]);
      mockProgressRepo.countCompletedByEnrollment.mockResolvedValue(1);
      mockEnrollmentRepo.update.mockResolvedValue(makeEnrollment({ status: EnrollmentStatus.COMPLETED, completedAt: NOW }));
      mockCourseRepo.findById.mockResolvedValue(makeCourse({ grantsCertification: true }));
      mockCertificationRepo.findByUserAndCourse.mockResolvedValue(null);
      mockCertificationRepo.create.mockResolvedValue({
        id: 'cert-001', sequenceNumber: 1, userId: LEARNER.id, courseId: 'course-001', certificateRef: null, issuedAt: NOW,
      });

      await service.updateLessonProgress('enrollment-001', 'lesson-001', { status: LessonProgressStatus.COMPLETED }, LEARNER);

      expect(mockEnrollmentRepo.update).toHaveBeenCalledWith('enrollment-001', expect.objectContaining({ status: EnrollmentStatus.COMPLETED }));
      expect(mockCertificationRepo.create).toHaveBeenCalledWith({ userId: LEARNER.id, courseId: 'course-001' });
      expect(mockCertificationRepo.setRef).toHaveBeenCalledWith('cert-001', 'AUR-CERT-000001');
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: LEARNER.id, category: NotificationCategory.ACADEMY, type: 'academy.course.completed',
      }));
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: LEARNER.id, category: NotificationCategory.ACADEMY, type: 'academy.certification.issued',
      }));
    });

    it('completes the course without issuing a certification when the course does not grant one', async () => {
      mockEnrollmentRepo.findById.mockResolvedValue(makeEnrollment());
      mockLessonRepo.findById.mockResolvedValue(makeLesson());
      mockModuleRepo.findById.mockResolvedValue(makeModule());
      mockProgressRepo.findByEnrollmentAndLesson.mockResolvedValue(null);
      mockProgressRepo.upsert.mockResolvedValue({
        id: 'progress-001', enrollmentId: 'enrollment-001', lessonId: 'lesson-001',
        status: LessonProgressStatus.COMPLETED, startedAt: NOW, completedAt: NOW, updatedAt: NOW,
      });
      mockLessonRepo.findByCourse.mockResolvedValue([makeLesson()]);
      mockProgressRepo.countCompletedByEnrollment.mockResolvedValue(1);
      mockEnrollmentRepo.update.mockResolvedValue(makeEnrollment({ status: EnrollmentStatus.COMPLETED, completedAt: NOW }));
      mockCourseRepo.findById.mockResolvedValue(makeCourse({ grantsCertification: false }));

      await service.updateLessonProgress('enrollment-001', 'lesson-001', { status: LessonProgressStatus.COMPLETED }, LEARNER);

      expect(mockCertificationRepo.create).not.toHaveBeenCalled();
    });

    it('does not re-complete an already-COMPLETED enrollment', async () => {
      mockEnrollmentRepo.findById.mockResolvedValue(makeEnrollment({ status: EnrollmentStatus.COMPLETED, completedAt: NOW }));
      mockLessonRepo.findById.mockResolvedValue(makeLesson());
      mockModuleRepo.findById.mockResolvedValue(makeModule());
      mockProgressRepo.findByEnrollmentAndLesson.mockResolvedValue(null);
      mockProgressRepo.upsert.mockResolvedValue({
        id: 'progress-001', enrollmentId: 'enrollment-001', lessonId: 'lesson-001',
        status: LessonProgressStatus.COMPLETED, startedAt: NOW, completedAt: NOW, updatedAt: NOW,
      });

      await service.updateLessonProgress('enrollment-001', 'lesson-001', { status: LessonProgressStatus.COMPLETED }, LEARNER);

      expect(mockEnrollmentRepo.update).not.toHaveBeenCalled();
      expect(mockLessonRepo.findByCourse).not.toHaveBeenCalled();
    });
  });
});
