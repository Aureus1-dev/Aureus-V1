import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CommunicationModule } from '../communication/communication.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { OrganizationsModule } from '../organizations/organizations.module';

import { CoursesController } from './courses/courses.controller';
import { CoursesService } from './courses/courses.service';
import { PrismaCourseRepository } from './courses/repositories/prisma-course.repository';
import { COURSE_REPOSITORY } from './courses/repositories/course.repository.interface';
import { PrismaCourseRevisionRepository } from './courses/repositories/prisma-course-revision.repository';
import { COURSE_REVISION_REPOSITORY } from './courses/repositories/course-revision.repository.interface';

import { ModulesController } from './courses/modules.controller';
import { ModulesService } from './courses/modules.service';
import { PrismaModuleRepository } from './courses/repositories/prisma-module.repository';
import { MODULE_REPOSITORY } from './courses/repositories/module.repository.interface';

import { LessonsController } from './courses/lessons.controller';
import { LessonsService } from './courses/lessons.service';
import { PrismaLessonRepository } from './courses/repositories/prisma-lesson.repository';
import { LESSON_REPOSITORY } from './courses/repositories/lesson.repository.interface';

import { LearningPathsController } from './learning-paths/learning-paths.controller';
import { LearningPathsService } from './learning-paths/learning-paths.service';
import { PrismaLearningPathRepository } from './learning-paths/repositories/prisma-learning-path.repository';
import { LEARNING_PATH_REPOSITORY } from './learning-paths/repositories/learning-path.repository.interface';

import { PathCoursesController } from './learning-paths/path-courses.controller';
import { PathCoursesService } from './learning-paths/path-courses.service';
import { PrismaLearningPathCourseRepository } from './learning-paths/repositories/prisma-learning-path-course.repository';
import { LEARNING_PATH_COURSE_REPOSITORY } from './learning-paths/repositories/learning-path-course.repository.interface';

import { EnrollmentsController } from './enrollments/enrollments.controller';
import { EnrollmentsService } from './enrollments/enrollments.service';
import { PrismaEnrollmentRepository } from './enrollments/repositories/prisma-enrollment.repository';
import { ENROLLMENT_REPOSITORY } from './enrollments/repositories/enrollment.repository.interface';
import { PrismaLessonProgressRepository } from './enrollments/repositories/prisma-lesson-progress.repository';
import { LESSON_PROGRESS_REPOSITORY } from './enrollments/repositories/lesson-progress.repository.interface';

import { CertificationsController } from './enrollments/certifications.controller';
import { CertificationsService } from './enrollments/certifications.service';
import { PrismaCertificationRepository } from './enrollments/repositories/prisma-certification.repository';
import { CERTIFICATION_REPOSITORY } from './enrollments/repositories/certification.repository.interface';

import { MediaAssetsController } from './media/media-assets.controller';
import { MediaAssetsService } from './media/media-assets.service';
import { PrismaMediaAssetRepository } from './media/repositories/prisma-media-asset.repository';
import { MEDIA_ASSET_REPOSITORY } from './media/repositories/media-asset.repository.interface';

import { CourseMediaController } from './media/course-media.controller';
import { CourseMediaService } from './media/course-media.service';
import { PrismaCourseMediaRepository } from './media/repositories/prisma-course-media.repository';
import { COURSE_MEDIA_REPOSITORY } from './media/repositories/course-media.repository.interface';

@Module({
  imports: [AuthGuardsModule, CommunicationModule, KnowledgeModule, OrganizationsModule],
  controllers: [
    CoursesController, ModulesController, LessonsController,
    LearningPathsController, PathCoursesController,
    EnrollmentsController, CertificationsController,
    MediaAssetsController, CourseMediaController,
  ],
  providers: [
    CoursesService,
    { provide: COURSE_REPOSITORY, useClass: PrismaCourseRepository },
    { provide: COURSE_REVISION_REPOSITORY, useClass: PrismaCourseRevisionRepository },
    ModulesService,
    { provide: MODULE_REPOSITORY, useClass: PrismaModuleRepository },
    LessonsService,
    { provide: LESSON_REPOSITORY, useClass: PrismaLessonRepository },
    LearningPathsService,
    { provide: LEARNING_PATH_REPOSITORY, useClass: PrismaLearningPathRepository },
    PathCoursesService,
    { provide: LEARNING_PATH_COURSE_REPOSITORY, useClass: PrismaLearningPathCourseRepository },
    EnrollmentsService,
    { provide: ENROLLMENT_REPOSITORY, useClass: PrismaEnrollmentRepository },
    { provide: LESSON_PROGRESS_REPOSITORY, useClass: PrismaLessonProgressRepository },
    CertificationsService,
    { provide: CERTIFICATION_REPOSITORY, useClass: PrismaCertificationRepository },
    MediaAssetsService,
    { provide: MEDIA_ASSET_REPOSITORY, useClass: PrismaMediaAssetRepository },
    CourseMediaService,
    { provide: COURSE_MEDIA_REPOSITORY, useClass: PrismaCourseMediaRepository },
  ],
  exports: [CoursesService, COURSE_REPOSITORY],
})
export class AcademyModule {}
