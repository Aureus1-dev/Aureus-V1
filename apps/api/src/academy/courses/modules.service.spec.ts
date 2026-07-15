import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademyContentStatus, LearningDomain, UserRole, VerificationStatus } from '@prisma/client';
import { ModulesService } from './modules.service';
import { CoursesService } from './courses.service';
import { IModuleRepository, MODULE_REPOSITORY } from './repositories/module.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Course, Module as ModuleModel } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const AUTHOR: AuthenticatedUser = { id: 'author-001', email: 'author@example.com', roles: [UserRole.STEWARD] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-001', email: 'member@example.com', roles: [UserRole.MEMBER] };

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

const mockModuleRepo: jest.Mocked<IModuleRepository> = {
  create: jest.fn(), findById: jest.fn(), findByCourse: jest.fn(),
  countByCourse: jest.fn(), update: jest.fn(), remove: jest.fn(),
};
const mockCoursesService = { getOwnedOrThrow: jest.fn(), findById: jest.fn() } as unknown as jest.Mocked<CoursesService>;

describe('ModulesService', () => {
  let service: ModulesService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        ModulesService,
        { provide: MODULE_REPOSITORY, useValue: mockModuleRepo },
        { provide: CoursesService, useValue: mockCoursesService },
      ],
    }).compile();
    service = m.get(ModulesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a module under a course the caller owns', async () => {
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());
      mockModuleRepo.create.mockResolvedValue(makeModule());

      const result = await service.create('course-001', { title: 'Module 1', position: 0 }, AUTHOR);

      expect(mockCoursesService.getOwnedOrThrow).toHaveBeenCalledWith('course-001', AUTHOR);
      expect(result.title).toBe('Module 1');
    });

    it('propagates the ForbiddenException from course ownership check', async () => {
      mockCoursesService.getOwnedOrThrow.mockRejectedValue(new ForbiddenException());
      await expect(service.create('course-001', { title: 'x', position: 0 }, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update / remove', () => {
    it('throws NotFoundException for a missing module', async () => {
      mockModuleRepo.findById.mockResolvedValue(null);
      await expect(service.update('ghost', { title: 'x' }, AUTHOR)).rejects.toThrow(NotFoundException);
    });

    it('checks ownership of the parent course before updating', async () => {
      mockModuleRepo.findById.mockResolvedValue(makeModule());
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());
      mockModuleRepo.update.mockResolvedValue(makeModule({ title: 'Updated' }));

      await service.update('module-001', { title: 'Updated' }, AUTHOR);
      expect(mockCoursesService.getOwnedOrThrow).toHaveBeenCalledWith('course-001', AUTHOR);
    });

    it('removes a module after confirming course ownership', async () => {
      mockModuleRepo.findById.mockResolvedValue(makeModule());
      mockCoursesService.getOwnedOrThrow.mockResolvedValue(makeCourse());

      await service.remove('module-001', AUTHOR);
      expect(mockModuleRepo.remove).toHaveBeenCalledWith('module-001');
    });
  });
});
