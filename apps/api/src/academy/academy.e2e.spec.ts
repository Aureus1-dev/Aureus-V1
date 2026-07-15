import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

/**
 * End-to-end test: boots the full Nest application and exercises the
 * Academy Foundation (WO-028, PA-010) — course/module/lesson authoring
 * with the verification workflow, revision snapshots, learning path
 * course sequencing, enrollment + lesson-progress tracking with
 * auto-completion, certification auto-issuance and its author/learner
 * notifications (the third real Communication System integration call
 * site), and Steward Content Studio media attachment.
 *
 * `Enrollment.userId`/`Certification.userId` carry real FKs to `User`
 * (ADR-014), so the `learner` persona is a real registered user via
 * `/auth/register`. `Course.authorId` stays a loose pointer (mirrors
 * `Resource.ownerId`), so the author/moderator personas stay synthetic
 * self-minted tokens, matching the WO-020/WO-027 e2e precedent.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('Academy — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const markerTitlePrefix = `E2E-WO028-${randomUUID()}-`;
  const emailMarker = `e2e-wo028-${randomUUID()}`;

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  const adminId = randomUUID();
  const memberId = randomUUID();
  let adminToken: string;
  let memberToken: string;

  let authorId: string;
  let authorToken: string;

  let learnerId: string;
  let learnerToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    adminToken = tokenFor(adminId, [UserRole.PLATFORM_ADMINISTRATOR]);
    memberToken = tokenFor(memberId, [UserRole.MEMBER]);

    authorId = randomUUID();
    authorToken = tokenFor(authorId, [UserRole.STEWARD]);

    const learnerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `learner-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    learnerId = learnerRes.body.user.id;
    learnerToken = tokenFor(learnerId, [UserRole.MEMBER]);
  });

  afterAll(async () => {
    await prisma.db.course.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.db.learningPath.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.db.mediaAsset.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
  });

  const coursePayload = (overrides: Record<string, unknown> = {}) => ({
    title: `${markerTitlePrefix}Financial Literacy Fundamentals`,
    shortDescription: 'Learn the basics of personal finance',
    fullDescription: 'A complete walkthrough of budgeting, saving, and investing fundamentals.',
    learningDomain: 'FINANCIAL_LITERACY',
    grantsCertification: true,
    ...overrides,
  });

  describe('access control', () => {
    it('rejects unauthenticated course creation', async () => {
      await request(app.getHttpServer()).post('/academy/courses').send(coursePayload()).expect(401);
    });

    it('rejects a plain member from creating a course', async () => {
      await request(app.getHttpServer())
        .post('/academy/courses')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(coursePayload())
        .expect(403);
    });
  });

  describe('full course lifecycle: authoring → modules/lessons → verification → enrollment → completion → certification', () => {
    let courseId: string;
    let courseRef: string;
    let moduleId: string;
    let lessonOneId: string;
    let lessonTwoId: string;
    let enrollmentId: string;

    it('lets a Steward author create a DRAFT course', async () => {
      const res = await request(app.getHttpServer())
        .post('/academy/courses')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(coursePayload())
        .expect(201);

      expect(res.body.status).toBe('DRAFT');
      expect(res.body.verificationStatus).toBe('DRAFT');
      expect(res.body.version).toBe(1);
      expect(res.body.courseRef).toMatch(/^AUR-CRS-\d{6}$/);
      courseId = res.body.id;
      courseRef = res.body.courseRef;
    });

    it('excludes the DRAFT course from the default VERIFIED-only listing', async () => {
      const res = await request(app.getHttpServer())
        .get(`/academy/courses?q=${encodeURIComponent(markerTitlePrefix)}`)
        .expect(200);
      expect(res.body.data.some((c: { id: string }) => c.id === courseId)).toBe(false);
    });

    it('creates a revision snapshot and bumps version on a substantive edit', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/academy/courses/${courseId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ fullDescription: 'A substantially revised walkthrough of financial fundamentals.' })
        .expect(200);
      expect(res.body.version).toBe(2);

      const revisions = await request(app.getHttpServer())
        .get(`/academy/courses/${courseId}/revisions`)
        .expect(200);
      expect(revisions.body).toHaveLength(1);
    });

    it('adds two modules to the course', async () => {
      const moduleRes = await request(app.getHttpServer())
        .post(`/academy/courses/${courseId}/modules`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ title: 'Module 1: Budgeting', position: 0 })
        .expect(201);
      moduleId = moduleRes.body.id;

      const listRes = await request(app.getHttpServer())
        .get(`/academy/courses/${courseId}/modules`)
        .expect(200);
      expect(listRes.body).toHaveLength(1);
    });

    it('adds two lessons to the module', async () => {
      const lessonOne = await request(app.getHttpServer())
        .post(`/academy/modules/${moduleId}/lessons`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ title: 'Lesson 1: Making a Budget', content: 'Content for lesson 1.', position: 0 })
        .expect(201);
      lessonOneId = lessonOne.body.id;

      const lessonTwo = await request(app.getHttpServer())
        .post(`/academy/modules/${moduleId}/lessons`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ title: 'Lesson 2: Tracking Spending', content: 'Content for lesson 2.', position: 1 })
        .expect(201);
      lessonTwoId = lessonTwo.body.id;

      const listRes = await request(app.getHttpServer())
        .get(`/academy/modules/${moduleId}/lessons`)
        .expect(200);
      expect(listRes.body).toHaveLength(2);
    });

    it('rejects a plain member from verifying', async () => {
      await request(app.getHttpServer())
        .post(`/academy/courses/${courseId}/submit-for-review`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/academy/courses/${courseId}/verify`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('lets an Administrator verify PENDING_REVIEW → VERIFIED and notifies the author', async () => {
      const res = await request(app.getHttpServer())
        .post(`/academy/courses/${courseId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(res.body.verificationStatus).toBe('VERIFIED');
      expect(res.body.status).toBe('ACTIVE');
    });

    it('now appears in the default VERIFIED-only listing and is fetchable by ref', async () => {
      const res = await request(app.getHttpServer())
        .get(`/academy/courses?q=${encodeURIComponent(markerTitlePrefix)}`)
        .expect(200);
      expect(res.body.data.some((c: { id: string }) => c.id === courseId)).toBe(true);

      await request(app.getHttpServer()).get(`/academy/courses/by-ref/${courseRef}`).expect(200);
    });

    it('lets the learner enroll in the course', async () => {
      const res = await request(app.getHttpServer())
        .post(`/academy/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.userId).toBe(learnerId);
      enrollmentId = res.body.id;
    });

    it('rejects a duplicate enrollment', async () => {
      await request(app.getHttpServer())
        .post(`/academy/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(409);
    });

    it('forbids another member from viewing the learner\'s enrollment', async () => {
      await request(app.getHttpServer())
        .get(`/academy/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('does not complete the enrollment after only the first lesson', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/academy/enrollments/${enrollmentId}/lessons/${lessonOneId}/progress`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);
      expect(res.body.status).toBe('COMPLETED');

      const enrollmentRes = await request(app.getHttpServer())
        .get(`/academy/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(enrollmentRes.body.status).toBe('ACTIVE');
    });

    it('auto-completes the enrollment and issues a certification once the last lesson completes', async () => {
      await request(app.getHttpServer())
        .patch(`/academy/enrollments/${enrollmentId}/lessons/${lessonTwoId}/progress`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      const enrollmentRes = await request(app.getHttpServer())
        .get(`/academy/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(enrollmentRes.body.status).toBe('COMPLETED');
      expect(enrollmentRes.body.completedAt).not.toBeNull();

      const certificationsRes = await request(app.getHttpServer())
        .get('/academy/certifications/me')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      const cert = certificationsRes.body.find((c: { courseId: string }) => c.courseId === courseId);
      expect(cert).toBeDefined();
      expect(cert.certificateRef).toMatch(/^AUR-CERT-\d{6}$/);

      const notifications = await request(app.getHttpServer())
        .get('/communications/notifications?category=ACADEMY')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(notifications.body.data.some((n: { type: string }) => n.type === 'academy.course.completed')).toBe(true);
      expect(notifications.body.data.some((n: { type: string }) => n.type === 'academy.certification.issued')).toBe(true);
    });

    it('archives the course', async () => {
      const res = await request(app.getHttpServer())
        .post(`/academy/courses/${courseId}/archive`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(201);
      expect(res.body.status).toBe('ARCHIVED');
    });
  });

  describe('learning paths', () => {
    let pathId: string;
    let courseAId: string;
    let courseBId: string;

    it('creates a learning path and two courses to sequence', async () => {
      const pathRes = await request(app.getHttpServer())
        .post('/academy/learning-paths')
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          title: `${markerTitlePrefix}Financial Independence Track`,
          shortDescription: 'A curated sequence',
          fullDescription: 'A full description of the financial independence track.',
        })
        .expect(201);
      pathId = pathRes.body.id;
      expect(pathRes.body.pathRef).toMatch(/^AUR-LP-\d{6}$/);

      const courseA = await request(app.getHttpServer())
        .post('/academy/courses')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(coursePayload({ title: `${markerTitlePrefix}Path Course A` }))
        .expect(201);
      courseAId = courseA.body.id;

      const courseB = await request(app.getHttpServer())
        .post('/academy/courses')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(coursePayload({ title: `${markerTitlePrefix}Path Course B` }))
        .expect(201);
      courseBId = courseB.body.id;
    });

    it('adds courses to the path in order and lists them by position', async () => {
      await request(app.getHttpServer())
        .post(`/academy/learning-paths/${pathId}/courses`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ courseId: courseBId, position: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/academy/learning-paths/${pathId}/courses`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ courseId: courseAId, position: 0 })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get(`/academy/learning-paths/${pathId}/courses`)
        .expect(200);
      expect(listRes.body.map((pc: { courseId: string }) => pc.courseId)).toEqual([courseAId, courseBId]);
    });

    it('rejects re-adding a course already in the path', async () => {
      await request(app.getHttpServer())
        .post(`/academy/learning-paths/${pathId}/courses`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ courseId: courseAId, position: 2 })
        .expect(409);
    });

    it('reorders and then removes a course from the path', async () => {
      const reorderRes = await request(app.getHttpServer())
        .patch(`/academy/learning-paths/${pathId}/courses/${courseBId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ position: 0 })
        .expect(200);
      expect(reorderRes.body.position).toBe(0);

      await request(app.getHttpServer())
        .delete(`/academy/learning-paths/${pathId}/courses/${courseAId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(204);

      const listRes = await request(app.getHttpServer())
        .get(`/academy/learning-paths/${pathId}/courses`)
        .expect(200);
      expect(listRes.body.map((pc: { courseId: string }) => pc.courseId)).toEqual([courseBId]);
    });
  });

  describe('Steward Content Studio (media)', () => {
    let courseId: string;
    let mediaAssetId: string;

    it('rejects a plain member from registering a media asset', async () => {
      await request(app.getHttpServer())
        .post('/academy/media')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ type: 'VIDEO', title: `${markerTitlePrefix}Intro Video`, storageRef: 's3://bucket/intro.mp4' })
        .expect(403);
    });

    it('lets a Steward register a media asset with an opaque storage reference', async () => {
      const res = await request(app.getHttpServer())
        .post('/academy/media')
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ type: 'VIDEO', title: `${markerTitlePrefix}Intro Video`, storageRef: 's3://bucket/intro.mp4' })
        .expect(201);
      expect(res.body.mediaRef).toMatch(/^AUR-MED-\d{6}$/);
      mediaAssetId = res.body.id;
    });

    it('attaches the media asset to a course and lists it', async () => {
      const courseRes = await request(app.getHttpServer())
        .post('/academy/courses')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(coursePayload({ title: `${markerTitlePrefix}Media Course` }))
        .expect(201);
      courseId = courseRes.body.id;

      await request(app.getHttpServer())
        .post(`/academy/courses/${courseId}/media`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ mediaAssetId, position: 0 })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get(`/academy/courses/${courseId}/media`)
        .expect(200);
      expect(listRes.body.some((cm: { mediaAssetId: string }) => cm.mediaAssetId === mediaAssetId)).toBe(true);
    });
  });
});
