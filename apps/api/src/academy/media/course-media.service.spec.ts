import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AcademyContentStatus, LearningDomain, MediaType, UserRole, VerificationStatus } from '@prisma/client';
import { CourseMediaService } from './course-media.service';
import { CoursesService } from '../courses/courses.service';
import { COURSE_MEDIA_REPOSITORY, ICourseMediaRepository } from './repositories/course-media.repository.interface';
import { MEDIA_ASSET_REPOSITORY, IMediaAssetRepository } from './repositories/media-asset.repository.interface';
import { COURSE_REPOSITORY, ICourseRepository } from '../courses/repositories/course.repository.interface';
import { ILessonRepository, LESSON_REPOSITORY } from '../courses/repositories/lesson.repository.interface';
import { IModuleRepository, MODULE_REPOSITORY } from '../courses/repositories/module.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Course, CourseMedia, Lesson, MediaAsset, Module as ModuleModel } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const AUTHOR: AuthenticatedUser = { id: 'author-001', email: 'author@example.com', roles: [UserRole.STEWARD] };

const makeCourse = (o: Partial<Course> = {}): Course => ({
  id: 'course-001', sequenceNumber: 1, courseRef: 'AUR-CRS-000001',
  title: 'Course', shortDescription: 'x', fullDescription: 'y full description here',
  learningDomain: LearningDomain.CAREER_READINESS, estimatedDurationMinutes: null,
  status: AcademyContentStatus.DRAFT, verificationStatus: VerificationStatus.DRAFT, rejectionReason: null,
  version: 1, grantsCertification: false, organizationId: null,
  authorId: AUTHOR.id, lastUpdatedById: AUTHOR.id,
  datePublished: null, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeAsset = (o: Partial<MediaAsset> = {}): MediaAsset => ({
  id: 'media-001', sequenceNumber: 1, mediaRef: 'AUR-MED-000001',
  type: MediaType.VIDEO, title: 'Video', description: null, storageRef: 's3://x',
  mimeType: null, sizeBytes: null, durationSeconds: null,
  uploadedById: AUTHOR.id, createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const makeCourseMedia = (o: Partial<CourseMedia> = {}): CourseMedia => ({
  id: 'cm-001', courseId: 'course-001', lessonId: null, mediaAssetId: 'media-001', position: 0, createdAt: NOW, ...o,
});

const makeLesson = (o: Partial<Lesson> = {}): Lesson => ({
  id: 'lesson-001', moduleId: 'module-001', title: 'Lesson', content: 'x', position: 0,
  estimatedDurationMinutes: null, relatedArticleId: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeModule = (o: Partial<ModuleModel> = {}): ModuleModel => ({
  id: 'module-001', courseId: 'course-001', title: 'Module', description: null, position: 0,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<ICourseMediaRepository> = {
  add: jest.fn(), findById: jest.fn(), findByCourse: jest.fn(), findByLesson: jest.fn(), remove: jest.fn(),
};
const mockMediaAssetRepo: jest.Mocked<Pick<IMediaAssetRepository, 'findById'>> = { findById: jest.fn() };
const mockCourseRepo: jest.Mocked<Pick<ICourseRepository, 'findById'>> = { findById: jest.fn() };
const mockLessonRepo: jest.Mocked<Pick<ILessonRepository, 'findById'>> = { findById: jest.fn() };
const mockModuleRepo: jest.Mocked<Pick<IModuleRepository, 'findById'>> = { findById: jest.fn() };
const mockCoursesService = { getOwnedOrThrow: jest.fn(), findById: jest.fn() } as unknown as jest.Mocked<CoursesService>;

describe('CourseMediaService', () => {
  let service: CourseMediaService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        CourseMediaService,
        { provide: COURSE_MEDIA_REPOSITORY, useValue: mockRepo },
        { provide: MEDIA_ASSET_REPOSITORY, useValue: mockMediaAssetRepo },
        { provide: COURSE_REPOSITORY, useValue: mockCourseRepo },
        { provide: LESSON_REPOSITORY, useValue: mockLessonRepo },
        { provide: MODULE_REPOSITORY, useValue: mockModuleRepo },
        { provide: CoursesService, useValue: mockCoursesService },
      ],
    }).compile();
    service = m.get(CourseMediaService);
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('attaches a media asset to a course the caller owns', async () => {
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());
      mockMediaAssetRepo.findById.mockResolvedValue(makeAsset());
      mockRepo.add.mockResolvedValue(makeCourseMedia());

      const result = await service.add('course-001', { mediaAssetId: 'media-001', position: 0 }, AUTHOR);
      expect(result.mediaAssetId).toBe('media-001');
    });

    it('throws NotFoundException when the media asset does not exist', async () => {
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());
      mockMediaAssetRepo.findById.mockResolvedValue(null);
      await expect(service.add('course-001', { mediaAssetId: 'ghost', position: 0 }, AUTHOR)).rejects.toThrow(NotFoundException);
    });

    it('validates that an attached lesson belongs to the course', async () => {
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());
      mockMediaAssetRepo.findById.mockResolvedValue(makeAsset());
      mockLessonRepo.findById.mockResolvedValue(makeLesson());
      mockModuleRepo.findById.mockResolvedValue(makeModule({ courseId: 'other-course' }));

      await expect(service.add('course-001', { mediaAssetId: 'media-001', lessonId: 'lesson-001', position: 0 }, AUTHOR))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes a course media item', async () => {
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());
      mockRepo.findById.mockResolvedValue(makeCourseMedia());

      await service.remove('course-001', 'cm-001', AUTHOR);
      expect(mockRepo.remove).toHaveBeenCalledWith('cm-001');
    });

    it('throws NotFoundException when the item belongs to a different course', async () => {
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());
      mockRepo.findById.mockResolvedValue(makeCourseMedia({ courseId: 'other-course' }));
      await expect(service.remove('course-001', 'cm-001', AUTHOR)).rejects.toThrow(NotFoundException);
    });
  });
});
