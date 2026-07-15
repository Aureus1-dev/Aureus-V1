import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcademyContentStatus, LearningDomain, UserRole, VerificationStatus } from '@prisma/client';
import { PathCoursesService } from './path-courses.service';
import { LearningPathsService } from './learning-paths.service';
import {
  ILearningPathCourseRepository,
  LEARNING_PATH_COURSE_REPOSITORY,
} from './repositories/learning-path-course.repository.interface';
import { COURSE_REPOSITORY, ICourseRepository } from '../courses/repositories/course.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Course, LearningPath, LearningPathCourse } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const AUTHOR: AuthenticatedUser = { id: 'author-001', email: 'author@example.com', roles: [UserRole.STEWARD] };

const makePath = (o: Partial<LearningPath> = {}): LearningPath => ({
  id: 'path-001', sequenceNumber: 1, pathRef: 'AUR-LP-000001',
  title: 'Track', shortDescription: 'x', fullDescription: 'y full description here',
  status: AcademyContentStatus.DRAFT, verificationStatus: VerificationStatus.DRAFT, rejectionReason: null,
  authorId: AUTHOR.id, lastUpdatedById: AUTHOR.id,
  datePublished: null, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeCourse = (o: Partial<Course> = {}): Course => ({
  id: 'course-001', sequenceNumber: 1, courseRef: 'AUR-CRS-000001',
  title: 'Course', shortDescription: 'x', fullDescription: 'y full description here',
  learningDomain: LearningDomain.CAREER_READINESS, estimatedDurationMinutes: null,
  status: AcademyContentStatus.ACTIVE, verificationStatus: VerificationStatus.VERIFIED, rejectionReason: null,
  version: 1, grantsCertification: false, organizationId: null,
  authorId: AUTHOR.id, lastUpdatedById: AUTHOR.id,
  datePublished: NOW, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makePathCourse = (o: Partial<LearningPathCourse> = {}): LearningPathCourse => ({
  id: 'pc-001', learningPathId: 'path-001', courseId: 'course-001', position: 0, createdAt: NOW, ...o,
});

const mockRepo: jest.Mocked<ILearningPathCourseRepository> = {
  add: jest.fn(), findByPath: jest.fn(), findOne: jest.fn(), updatePosition: jest.fn(), remove: jest.fn(),
};
const mockCourseRepo: jest.Mocked<Pick<ICourseRepository, 'findById'>> = { findById: jest.fn() };
const mockLearningPathsService = { getOwnedOrThrow: jest.fn(), findById: jest.fn() } as unknown as jest.Mocked<LearningPathsService>;

describe('PathCoursesService', () => {
  let service: PathCoursesService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PathCoursesService,
        { provide: LEARNING_PATH_COURSE_REPOSITORY, useValue: mockRepo },
        { provide: COURSE_REPOSITORY, useValue: mockCourseRepo },
        { provide: LearningPathsService, useValue: mockLearningPathsService },
      ],
    }).compile();
    service = m.get(PathCoursesService);
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('adds a course to a learning path the caller owns', async () => {
      mockLearningPathsService.getOwnedOrThrow.mockResolvedValue(makePath());
      mockCourseRepo.findById.mockResolvedValue(makeCourse());
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.add.mockResolvedValue(makePathCourse());

      const result = await service.add('path-001', { courseId: 'course-001', position: 0 }, AUTHOR);
      expect(result.courseId).toBe('course-001');
    });

    it('throws NotFoundException when the course does not exist', async () => {
      mockLearningPathsService.getOwnedOrThrow.mockResolvedValue(makePath());
      mockCourseRepo.findById.mockResolvedValue(null);
      await expect(service.add('path-001', { courseId: 'ghost', position: 0 }, AUTHOR)).rejects.toThrow(NotFoundException);
    });

    it('rejects adding a course already in the path', async () => {
      mockLearningPathsService.getOwnedOrThrow.mockResolvedValue(makePath());
      mockCourseRepo.findById.mockResolvedValue(makeCourse());
      mockRepo.findOne.mockResolvedValue(makePathCourse());
      await expect(service.add('path-001', { courseId: 'course-001', position: 1 }, AUTHOR)).rejects.toThrow(ConflictException);
    });
  });

  describe('reorder / remove', () => {
    it('reorders a course within the path', async () => {
      mockLearningPathsService.getOwnedOrThrow.mockResolvedValue(makePath());
      mockRepo.findOne.mockResolvedValue(makePathCourse());
      mockRepo.updatePosition.mockResolvedValue(makePathCourse({ position: 2 }));

      const result = await service.reorder('path-001', 'course-001', { position: 2 }, AUTHOR);
      expect(result.position).toBe(2);
    });

    it('throws NotFoundException reordering a course not in the path', async () => {
      mockLearningPathsService.getOwnedOrThrow.mockResolvedValue(makePath());
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.reorder('path-001', 'ghost', { position: 1 }, AUTHOR)).rejects.toThrow(NotFoundException);
    });

    it('removes a course from the path', async () => {
      mockLearningPathsService.getOwnedOrThrow.mockResolvedValue(makePath());
      mockRepo.findOne.mockResolvedValue(makePathCourse());

      await service.remove('path-001', 'course-001', AUTHOR);
      expect(mockRepo.remove).toHaveBeenCalledWith('pc-001');
    });
  });
});
