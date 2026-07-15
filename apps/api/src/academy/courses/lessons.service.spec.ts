import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AcademyContentStatus, LearningDomain, UserRole, VerificationStatus } from '@prisma/client';
import { LessonsService } from './lessons.service';
import { CoursesService } from './courses.service';
import { ILessonRepository, LESSON_REPOSITORY } from './repositories/lesson.repository.interface';
import { IModuleRepository, MODULE_REPOSITORY } from './repositories/module.repository.interface';
import {
  IKnowledgeArticleRepository,
  KNOWLEDGE_ARTICLE_REPOSITORY,
} from '../../knowledge/repositories/knowledge-article.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Course, Lesson, Module as ModuleModel } from '@prisma/client';

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

const makeModule = (o: Partial<ModuleModel> = {}): ModuleModel => ({
  id: 'module-001', courseId: 'course-001', title: 'Module 1', description: null, position: 0,
  createdAt: NOW, updatedAt: NOW, ...o,
});

const makeLesson = (o: Partial<Lesson> = {}): Lesson => ({
  id: 'lesson-001', moduleId: 'module-001', title: 'Lesson 1', content: 'Content', position: 0,
  estimatedDurationMinutes: null, relatedArticleId: null, createdAt: NOW, updatedAt: NOW, ...o,
});

const mockLessonRepo: jest.Mocked<ILessonRepository> = {
  create: jest.fn(), findById: jest.fn(), findByModule: jest.fn(), findByCourse: jest.fn(),
  countByModule: jest.fn(), update: jest.fn(), remove: jest.fn(),
};
const mockModuleRepo: jest.Mocked<IModuleRepository> = {
  create: jest.fn(), findById: jest.fn(), findByCourse: jest.fn(),
  countByCourse: jest.fn(), update: jest.fn(), remove: jest.fn(),
};
const mockKnowledgeArticleRepo: jest.Mocked<Pick<IKnowledgeArticleRepository, 'findById'>> = { findById: jest.fn() };
const mockCoursesService = { getOwnedOrThrow: jest.fn(), findById: jest.fn() } as unknown as jest.Mocked<CoursesService>;

describe('LessonsService', () => {
  let service: LessonsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: LESSON_REPOSITORY, useValue: mockLessonRepo },
        { provide: MODULE_REPOSITORY, useValue: mockModuleRepo },
        { provide: KNOWLEDGE_ARTICLE_REPOSITORY, useValue: mockKnowledgeArticleRepo },
        { provide: CoursesService, useValue: mockCoursesService },
      ],
    }).compile();
    service = m.get(LessonsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a lesson under a module whose course the caller owns', async () => {
      mockModuleRepo.findById.mockResolvedValue(makeModule());
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());
      mockLessonRepo.create.mockResolvedValue(makeLesson());

      const result = await service.create('module-001', { title: 'Lesson 1', content: 'Content', position: 0 }, AUTHOR);

      expect(mockCoursesService.getOwnedOrThrow).toHaveBeenCalledWith('course-001', AUTHOR);
      expect(result.title).toBe('Lesson 1');
    });

    it('validates relatedArticleId exists via the Knowledge System when supplied', async () => {
      mockModuleRepo.findById.mockResolvedValue(makeModule());
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());
      mockKnowledgeArticleRepo.findById.mockResolvedValue(null);

      await expect(service.create('module-001', {
        title: 'Lesson 1', content: 'Content', position: 0, relatedArticleId: 'article-ghost',
      }, AUTHOR)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for a missing module', async () => {
      mockModuleRepo.findById.mockResolvedValue(null);
      await expect(service.create('ghost', { title: 'x', content: 'y', position: 0 }, AUTHOR)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update / remove', () => {
    it('checks the parent module and course ownership before updating', async () => {
      mockLessonRepo.findById.mockResolvedValue(makeLesson());
      mockModuleRepo.findById.mockResolvedValue(makeModule());
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());
      mockLessonRepo.update.mockResolvedValue(makeLesson({ title: 'Updated' }));

      await service.update('lesson-001', { title: 'Updated' }, AUTHOR);
      expect(mockCoursesService.getOwnedOrThrow).toHaveBeenCalledWith('course-001', AUTHOR);
    });

    it('removes a lesson after confirming ownership', async () => {
      mockLessonRepo.findById.mockResolvedValue(makeLesson());
      mockModuleRepo.findById.mockResolvedValue(makeModule());
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());

      await service.remove('lesson-001', AUTHOR);
      expect(mockLessonRepo.remove).toHaveBeenCalledWith('lesson-001');
    });
  });
});
