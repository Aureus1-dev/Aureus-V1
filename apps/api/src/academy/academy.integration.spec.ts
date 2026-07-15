import { randomUUID } from 'crypto';
import { LearningDomain, LessonProgressStatus, MediaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaCourseRepository } from './courses/repositories/prisma-course.repository';
import { PrismaCourseRevisionRepository } from './courses/repositories/prisma-course-revision.repository';
import { PrismaModuleRepository } from './courses/repositories/prisma-module.repository';
import { PrismaLessonRepository } from './courses/repositories/prisma-lesson.repository';
import { PrismaLearningPathRepository } from './learning-paths/repositories/prisma-learning-path.repository';
import { PrismaLearningPathCourseRepository } from './learning-paths/repositories/prisma-learning-path-course.repository';
import { PrismaEnrollmentRepository } from './enrollments/repositories/prisma-enrollment.repository';
import { PrismaLessonProgressRepository } from './enrollments/repositories/prisma-lesson-progress.repository';
import { PrismaCertificationRepository } from './enrollments/repositories/prisma-certification.repository';
import { PrismaMediaAssetRepository } from './media/repositories/prisma-media-asset.repository';
import { PrismaCourseMediaRepository } from './media/repositories/prisma-course-media.repository';

/**
 * Integration test: exercises the Academy domain's Prisma repositories
 * against a real PostgreSQL database (no mocks) — verifying the nested
 * cross-level Lesson query (`where: { module: { courseId } }`), the
 * [courseId, versionNumber] gap-free revision constraint, the ordered
 * LearningPathCourse join, Enrollment/LessonProgress uniqueness, and the
 * MediaAsset/CourseMedia storage-abstraction relationships (ADR-014).
 *
 * Requires DATABASE_URL to point at a reachable, migrated database.
 */
describe('Academy — Prisma integration', () => {
  let prisma: PrismaService;
  let courseRepo: PrismaCourseRepository;
  let revisionRepo: PrismaCourseRevisionRepository;
  let moduleRepo: PrismaModuleRepository;
  let lessonRepo: PrismaLessonRepository;
  let pathRepo: PrismaLearningPathRepository;
  let pathCourseRepo: PrismaLearningPathCourseRepository;
  let enrollmentRepo: PrismaEnrollmentRepository;
  let progressRepo: PrismaLessonProgressRepository;
  let certificationRepo: PrismaCertificationRepository;
  let mediaAssetRepo: PrismaMediaAssetRepository;
  let courseMediaRepo: PrismaCourseMediaRepository;

  const authorId = randomUUID();
  const markerTitlePrefix = `INTEGRATION-TEST-${randomUUID()}-`;
  const emailMarker = `integration-wo028-${randomUUID()}`;
  let learnerId: string;
  const courseIds: string[] = [];
  const pathIds: string[] = [];
  const mediaAssetIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    courseRepo = new PrismaCourseRepository(prisma);
    revisionRepo = new PrismaCourseRevisionRepository(prisma);
    moduleRepo = new PrismaModuleRepository(prisma);
    lessonRepo = new PrismaLessonRepository(prisma);
    pathRepo = new PrismaLearningPathRepository(prisma);
    pathCourseRepo = new PrismaLearningPathCourseRepository(prisma);
    enrollmentRepo = new PrismaEnrollmentRepository(prisma);
    progressRepo = new PrismaLessonProgressRepository(prisma);
    certificationRepo = new PrismaCertificationRepository(prisma);
    mediaAssetRepo = new PrismaMediaAssetRepository(prisma);
    courseMediaRepo = new PrismaCourseMediaRepository(prisma);

    // Enrollment.userId / Certification.userId are real FKs to User (unlike
    // Course.authorId, a loose attribution pointer) — a genuine registered
    // user row is required to exercise those repositories.
    const learner = await prisma.db.user.create({ data: { email: `learner-${emailMarker}@example.test` } });
    learnerId = learner.id;
  });

  afterAll(async () => {
    // Cascades clean up Module/Lesson/LearningPathCourse/Enrollment/
    // LessonProgress/Certification/CourseMedia rows via onDelete: Cascade.
    await prisma.db.course.deleteMany({ where: { id: { in: courseIds } } });
    await prisma.db.learningPath.deleteMany({ where: { id: { in: pathIds } } });
    await prisma.db.mediaAsset.deleteMany({ where: { id: { in: mediaAssetIds } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await prisma.onModuleDestroy();
  });

  const makeCourse = async (titleSuffix: string) => {
    const course = await courseRepo.create({
      title: `${markerTitlePrefix}${titleSuffix}`,
      shortDescription: 'Short',
      fullDescription: 'A full description of the course content.',
      learningDomain: LearningDomain.FINANCIAL_LITERACY,
      authorId, lastUpdatedById: authorId,
    });
    courseIds.push(course.id);
    return course;
  };

  it('persists a course and enforces the unique courseRef constraint', async () => {
    const created = await makeCourse('CourseRef');
    expect(created.courseRef).toBeNull();

    const ref = `AUR-CRS-${created.sequenceNumber.toString().padStart(6, '0')}`;
    const withRef = await courseRepo.setRef(created.id, ref);
    expect(withRef.courseRef).toBe(ref);

    const another = await makeCourse('CourseRefDup');
    await expect(courseRepo.setRef(another.id, ref)).rejects.toThrow();
  });

  it('enforces the [courseId, versionNumber] unique constraint on revisions', async () => {
    const course = await makeCourse('Revisions');
    await revisionRepo.create({
      courseId: course.id, versionNumber: 1, title: course.title,
      shortDescription: course.shortDescription, fullDescription: course.fullDescription, editedById: authorId,
    });

    await expect(revisionRepo.create({
      courseId: course.id, versionNumber: 1, title: 'Dup', shortDescription: 'x', fullDescription: 'y', editedById: authorId,
    })).rejects.toThrow();

    const history = await revisionRepo.findByCourse(course.id);
    expect(history).toHaveLength(1);
  });

  it('finds lessons by course via the nested module.courseId query, ordered by module then lesson position', async () => {
    const course = await makeCourse('NestedLessons');
    const moduleA = await moduleRepo.create({ courseId: course.id, title: 'Module A', position: 0 });
    const moduleB = await moduleRepo.create({ courseId: course.id, title: 'Module B', position: 1 });

    await lessonRepo.create({ moduleId: moduleB.id, title: 'B-Lesson 2', content: 'x', position: 1 });
    await lessonRepo.create({ moduleId: moduleA.id, title: 'A-Lesson 1', content: 'x', position: 0 });
    await lessonRepo.create({ moduleId: moduleB.id, title: 'B-Lesson 1', content: 'x', position: 0 });
    await lessonRepo.create({ moduleId: moduleA.id, title: 'A-Lesson 2', content: 'x', position: 1 });

    const lessons = await lessonRepo.findByCourse(course.id);
    expect(lessons.map((l) => l.title)).toEqual(['A-Lesson 1', 'A-Lesson 2', 'B-Lesson 1', 'B-Lesson 2']);
  });

  it('orders LearningPathCourse entries by position and enforces uniqueness per (path, course)', async () => {
    const courseOne = await makeCourse('PathCourseOne');
    const courseTwo = await makeCourse('PathCourseTwo');

    const path = await pathRepo.create({
      title: `${markerTitlePrefix}Path`, shortDescription: 'x', fullDescription: 'A full description of the path.',
      authorId, lastUpdatedById: authorId,
    });
    pathIds.push(path.id);

    await pathCourseRepo.add({ learningPathId: path.id, courseId: courseTwo.id, position: 1 });
    await pathCourseRepo.add({ learningPathId: path.id, courseId: courseOne.id, position: 0 });

    const ordered = await pathCourseRepo.findByPath(path.id);
    expect(ordered.map((pc) => pc.courseId)).toEqual([courseOne.id, courseTwo.id]);

    await expect(pathCourseRepo.add({ learningPathId: path.id, courseId: courseOne.id, position: 2 })).rejects.toThrow();
  });

  it('enforces the unique (userId, courseId) constraint on Enrollment and tracks LessonProgress completion', async () => {
    const course = await makeCourse('EnrollmentFlow');
    const module = await moduleRepo.create({ courseId: course.id, title: 'Module', position: 0 });
    const lesson = await lessonRepo.create({ moduleId: module.id, title: 'Lesson', content: 'x', position: 0 });

    const enrollment = await enrollmentRepo.create({ userId: learnerId, courseId: course.id });
    await expect(enrollmentRepo.create({ userId: learnerId, courseId: course.id })).rejects.toThrow();

    await progressRepo.upsert({ enrollmentId: enrollment.id, lessonId: lesson.id, status: LessonProgressStatus.COMPLETED, completedAt: new Date() });
    const completedCount = await progressRepo.countCompletedByEnrollment(enrollment.id);
    expect(completedCount).toBe(1);

    // Upsert is idempotent — updating the same (enrollment, lesson) pair does not duplicate rows.
    await progressRepo.upsert({ enrollmentId: enrollment.id, lessonId: lesson.id, status: LessonProgressStatus.COMPLETED, completedAt: new Date() });
    const progress = await progressRepo.findByEnrollment(enrollment.id);
    expect(progress).toHaveLength(1);
  });

  it('enforces the unique (userId, courseId) constraint on Certification and the certificateRef sequence', async () => {
    const course = await makeCourse('Certification');
    const certification = await certificationRepo.create({ userId: learnerId, courseId: course.id });
    expect(certification.sequenceNumber).toBeGreaterThan(0);

    const ref = `AUR-CERT-${certification.sequenceNumber.toString().padStart(6, '0')}`;
    const withRef = await certificationRepo.setRef(certification.id, ref);
    expect(withRef.certificateRef).toBe(ref);

    await expect(certificationRepo.create({ userId: learnerId, courseId: course.id })).rejects.toThrow();
  });

  it('persists a MediaAsset with an opaque storageRef and links it to a course via CourseMedia', async () => {
    const course = await makeCourse('MediaLink');
    const asset = await mediaAssetRepo.create({
      type: MediaType.VIDEO, title: `${markerTitlePrefix}Video`, storageRef: 's3://bucket/key.mp4', uploadedById: authorId,
    });
    mediaAssetIds.push(asset.id);

    const ref = `AUR-MED-${asset.sequenceNumber.toString().padStart(6, '0')}`;
    const withRef = await mediaAssetRepo.setRef(asset.id, ref);
    expect(withRef.mediaRef).toBe(ref);

    const link = await courseMediaRepo.add({ courseId: course.id, mediaAssetId: asset.id, position: 0 });
    const byCourse = await courseMediaRepo.findByCourse(course.id);
    expect(byCourse.map((cm) => cm.id)).toContain(link.id);
  });
});
