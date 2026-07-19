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
 * Knowledge System (WO-027, PA-013) — creator-role gating, the
 * verification workflow, default VERIFIED-only listing, revision-history
 * tracking, and the second real Communication System integration call site
 * (author notification on verify/reject, alongside WO-026's Announcements
 * fan-out).
 *
 * `Notification.recipientId` carries a real FK to `User` (ADR-012), so the
 * `author` persona — who must receive real notifications in this spec — is
 * a real registered user via `/auth/register`. `KnowledgeArticle.authorId`
 * itself is a loose pointer (ADR-013, mirrors `Resource.ownerId`), so the
 * moderator personas stay fully synthetic self-minted tokens, matching the
 * WO-020 Resources e2e precedent.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('Knowledge System — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const markerTitlePrefix = `E2E-WO027-${randomUUID()}-`;
  const emailMarker = `e2e-wo027-${randomUUID()}`;

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  const adminId = randomUUID();
  const memberId = randomUUID();
  let adminToken: string;
  let memberToken: string;

  let authorId: string;
  let authorToken: string;

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

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `author-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    authorId = res.body.user.id;
    authorToken = tokenFor(authorId, [UserRole.STEWARD]);
  });

  afterAll(async () => {
    await prisma.db.knowledgeArticle.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
  });

  const validPayload = (overrides: Record<string, unknown> = {}) => ({
    title: `${markerTitlePrefix}How to Request a Steward`,
    summary: 'A quick guide to requesting a steward',
    content: 'Full walkthrough content describing the steward request process in detail.',
    category: 'GUIDE',
    tags: ['stewardship', 'getting-started'],
    ...overrides,
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).post('/knowledge/articles').send(validPayload()).expect(401);
  });

  it('rejects a plain member from creating an article', async () => {
    await request(app.getHttpServer())
      .post('/knowledge/articles')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(validPayload())
      .expect(403);
  });

  describe('full lifecycle', () => {
    let articleId: string;

    it('lets a Steward author create a DRAFT article', async () => {
      const res = await request(app.getHttpServer())
        .post('/knowledge/articles')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(validPayload())
        .expect(201);

      expect(res.body.status).toBe('DRAFT');
      expect(res.body.verificationStatus).toBe('DRAFT');
      expect(res.body.version).toBe(1);
      expect(res.body.articleRef).toMatch(/^AUR-KB-\d{6}$/);
      articleId = res.body.id;
    });

    it('excludes the DRAFT article from the default VERIFIED-only listing', async () => {
      const res = await request(app.getHttpServer())
        .get(`/knowledge/articles?q=${encodeURIComponent(markerTitlePrefix)}`)
        .expect(200);
      expect(res.body.data.some((a: { id: string }) => a.id === articleId)).toBe(false);
    });

    it('blocks unauthenticated direct lookup while unverified, but allows a Steward/Admin (PD-001)', async () => {
      await request(app.getHttpServer()).get(`/knowledge/articles/${articleId}`).expect(404);
      await request(app.getHttpServer())
        .get(`/knowledge/articles/${articleId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(200);
    });

    it('rejects a non-author, non-privileged caller from updating it', async () => {
      await request(app.getHttpServer())
        .patch(`/knowledge/articles/${articleId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ tags: ['x'] })
        .expect(403);
    });

    it('creates no revision for a non-substantive edit (tags only)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/knowledge/articles/${articleId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ tags: ['stewardship', 'faq'] })
        .expect(200);
      expect(res.body.version).toBe(1);

      const revisions = await request(app.getHttpServer())
        .get(`/knowledge/articles/${articleId}/revisions`)
        .expect(200);
      expect(revisions.body).toHaveLength(0);
    });

    it('creates a revision snapshot and bumps version on a substantive edit', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/knowledge/articles/${articleId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ content: 'A substantially revised walkthrough of the steward request process.' })
        .expect(200);
      expect(res.body.version).toBe(2);

      const revisions = await request(app.getHttpServer())
        .get(`/knowledge/articles/${articleId}/revisions`)
        .expect(200);
      expect(revisions.body).toHaveLength(1);
      expect(revisions.body[0].versionNumber).toBe(1);
    });

    it('submits DRAFT → PENDING_REVIEW', async () => {
      const res = await request(app.getHttpServer())
        .post(`/knowledge/articles/${articleId}/submit-for-review`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(201);
      expect(res.body.verificationStatus).toBe('PENDING_REVIEW');
    });

    it('rejects a plain member from verifying', async () => {
      await request(app.getHttpServer())
        .post(`/knowledge/articles/${articleId}/verify`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('lets an Administrator verify PENDING_REVIEW → VERIFIED and notifies the author', async () => {
      const res = await request(app.getHttpServer())
        .post(`/knowledge/articles/${articleId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(res.body.verificationStatus).toBe('VERIFIED');
      expect(res.body.status).toBe('ACTIVE');

      const notifications = await request(app.getHttpServer())
        .get('/communications/notifications?category=KNOWLEDGE')
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(200);
      expect(notifications.body.data.some((n: { type: string }) => n.type === 'knowledge.article.verified')).toBe(true);
    });

    it('now appears in the default VERIFIED-only listing', async () => {
      const res = await request(app.getHttpServer())
        .get(`/knowledge/articles?q=${encodeURIComponent(markerTitlePrefix)}`)
        .expect(200);
      expect(res.body.data.some((a: { id: string }) => a.id === articleId)).toBe(true);
    });

    it('is fetchable by its stable reference', async () => {
      const article = await request(app.getHttpServer()).get(`/knowledge/articles/${articleId}`).expect(200);
      await request(app.getHttpServer()).get(`/knowledge/articles/by-ref/${article.body.articleRef}`).expect(200);
    });

    it('archives the article', async () => {
      const res = await request(app.getHttpServer())
        .post(`/knowledge/articles/${articleId}/archive`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(201);
      expect(res.body.status).toBe('ARCHIVED');
      expect(res.body.verificationStatus).toBe('ARCHIVED');
    });
  });

  describe('rejection path', () => {
    let articleId: string;

    it('creates, submits, and rejects an article, notifying the author with the reason', async () => {
      const created = await request(app.getHttpServer())
        .post('/knowledge/articles')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(validPayload({ title: `${markerTitlePrefix}Needs Work` }))
        .expect(201);
      articleId = created.body.id;

      await request(app.getHttpServer())
        .post(`/knowledge/articles/${articleId}/submit-for-review`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(201);

      const rejected = await request(app.getHttpServer())
        .post(`/knowledge/articles/${articleId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: 'Needs more detail before it can be published.' })
        .expect(201);
      expect(rejected.body.verificationStatus).toBe('REJECTED');
      expect(rejected.body.rejectionReason).toBe('Needs more detail before it can be published.');

      const notifications = await request(app.getHttpServer())
        .get('/communications/notifications?category=KNOWLEDGE')
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(200);
      expect(notifications.body.data.some((n: { type: string }) => n.type === 'knowledge.article.rejected')).toBe(true);
    });

    it('rejects re-rejecting an already-REJECTED article', async () => {
      await request(app.getHttpServer())
        .post(`/knowledge/articles/${articleId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: 'Rejected again for testing purposes.' })
        .expect(409);
    });
  });

  describe('soft delete', () => {
    it('rejects a non-author, non-privileged caller from deleting', async () => {
      const created = await request(app.getHttpServer())
        .post('/knowledge/articles')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(validPayload({ title: `${markerTitlePrefix}Deletable` }))
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/knowledge/articles/${created.body.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('lets the author soft-delete their own article', async () => {
      const created = await request(app.getHttpServer())
        .post('/knowledge/articles')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(validPayload({ title: `${markerTitlePrefix}Deletable2` }))
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/knowledge/articles/${created.body.id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(204);

      await request(app.getHttpServer()).get(`/knowledge/articles/${created.body.id}`).expect(404);
    });
  });
});
