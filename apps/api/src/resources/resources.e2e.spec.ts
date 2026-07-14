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
 * End-to-end test: boots the full Nest application (real HTTP layer, real
 * guards, real ValidationPipe, real exception filter, real PostgreSQL) and
 * exercises the Resource Directory through Supertest — mirroring the manual
 * curl-based verification performed for WO-019, but automated.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET to be set (see test/jest.setup.js).
 */
describe('Resources — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const markerTitlePrefix = `E2E-TEST-${randomUUID()}-`;

  const orgRepId = randomUUID();
  const stewardId = randomUUID();
  const adminId = randomUUID();
  const memberId = randomUUID();
  const otherMemberId = randomUUID();

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  let orgRepToken: string;
  let stewardToken: string;
  let adminToken: string;
  let memberToken: string;
  let otherMemberToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    orgRepToken = tokenFor(orgRepId, [UserRole.ORGANIZATION_REPRESENTATIVE]);
    stewardToken = tokenFor(stewardId, [UserRole.STEWARD]);
    adminToken = tokenFor(adminId, [UserRole.PLATFORM_ADMINISTRATOR]);
    memberToken = tokenFor(memberId, [UserRole.MEMBER]);
    otherMemberToken = tokenFor(otherMemberId, [UserRole.MEMBER]);
  });

  afterAll(async () => {
    await prisma.db.resource.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await app.close();
  });

  const validPayload = (overrides: Record<string, unknown> = {}) => ({
    title: `${markerTitlePrefix}Community Legal Aid`,
    shortDescription: 'Free legal consultations for residents',
    fullDescription: 'A full description of the legal aid services offered to the community.',
    category: 'LEGAL_SERVICES',
    resourceType: 'ORGANIZATION',
    tags: ['free', 'walk-in'],
    organizationName: 'Community Legal Aid Society',
    officialSourceUrl: 'https://legalaid.example.org',
    sourceName: 'Community Legal Aid Society',
    ...overrides,
  });

  it('rejects resource creation with no token', async () => {
    await request(app.getHttpServer()).post('/resources').send(validPayload()).expect(401);
  });

  it('rejects resource creation for a caller without a creator role', async () => {
    await request(app.getHttpServer())
      .post('/resources')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(validPayload())
      .expect(403);
  });

  it('rejects creation with invalid payload (400, structured error)', async () => {
    const res = await request(app.getHttpServer())
      .post('/resources')
      .set('Authorization', `Bearer ${orgRepToken}`)
      .send({ title: 'x' }) // too short, missing required fields
      .expect(400);

    expect(res.body).toMatchObject({ statusCode: 400 });
    expect(Array.isArray(res.body.message) || typeof res.body.message === 'string').toBe(true);
  });

  describe('full lifecycle', () => {
    let resourceId: string;
    let resourceRef: string;

    it('creates a DRAFT resource owned by the caller', async () => {
      const res = await request(app.getHttpServer())
        .post('/resources')
        .set('Authorization', `Bearer ${orgRepToken}`)
        .send(validPayload())
        .expect(201);

      expect(res.body.ownerId).toBe(orgRepId);
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.verificationStatus).toBe('DRAFT');
      expect(res.body.resourceRef).toMatch(/^AUR-RES-\d{6}$/);

      resourceId = res.body.id;
      resourceRef = res.body.resourceRef;
    });

    it('excludes DRAFT resources from the default public listing', async () => {
      const res = await request(app.getHttpServer())
        .get('/resources')
        .query({ q: markerTitlePrefix })
        .expect(200);

      expect(res.body.data.find((r: { id: string }) => r.id === resourceId)).toBeUndefined();
    });

    it('allows direct lookup by id and by ref regardless of verification status', async () => {
      const byId = await request(app.getHttpServer()).get(`/resources/${resourceId}`).expect(200);
      expect(byId.body.id).toBe(resourceId);

      const byRef = await request(app.getHttpServer()).get(`/resources/by-ref/${resourceRef}`).expect(200);
      expect(byRef.body.id).toBe(resourceId);
    });

    it('forbids a non-owner member from updating the resource', async () => {
      await request(app.getHttpServer())
        .patch(`/resources/${resourceId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: `${markerTitlePrefix}Hijacked` })
        .expect(403);
    });

    it('allows the owning organization to update its own resource', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/resources/${resourceId}`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .send({ shortDescription: 'Updated short description' })
        .expect(200);

      expect(res.body.shortDescription).toBe('Updated short description');
    });

    it('moves DRAFT → PENDING_REVIEW when the owner submits for review', async () => {
      const res = await request(app.getHttpServer())
        .post(`/resources/${resourceId}/submit-for-review`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .expect(201);

      expect(res.body.verificationStatus).toBe('PENDING_REVIEW');
    });

    it('forbids a non-Steward/Admin from verifying', async () => {
      await request(app.getHttpServer())
        .post(`/resources/${resourceId}/verify`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .expect(403);
    });

    it('allows a Steward to verify PENDING_REVIEW → VERIFIED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/resources/${resourceId}/verify`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .expect(201);

      expect(res.body.verificationStatus).toBe('VERIFIED');
      expect(res.body.status).toBe('ACTIVE');
    });

    it('now appears in the default public (VERIFIED) listing', async () => {
      const res = await request(app.getHttpServer())
        .get('/resources')
        .query({ q: markerTitlePrefix })
        .expect(200);

      expect(res.body.data.some((r: { id: string }) => r.id === resourceId)).toBe(true);
    });

    it('forbids a non-owner, non-privileged caller from archiving', async () => {
      await request(app.getHttpServer())
        .post(`/resources/${resourceId}/archive`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('allows an Admin to archive regardless of ownership', async () => {
      const res = await request(app.getHttpServer())
        .post(`/resources/${resourceId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.status).toBe('ARCHIVED');
    });

    it('allows the owner to soft-delete, after which it 404s', async () => {
      await request(app.getHttpServer())
        .delete(`/resources/${resourceId}`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .expect(204);

      await request(app.getHttpServer()).get(`/resources/${resourceId}`).expect(404);
    });
  });

  describe('rejection workflow', () => {
    it('rejects a PENDING_REVIEW resource with a reason', async () => {
      const created = await request(app.getHttpServer())
        .post('/resources')
        .set('Authorization', `Bearer ${orgRepToken}`)
        .send(validPayload({ title: `${markerTitlePrefix}To Reject` }))
        .expect(201);

      await request(app.getHttpServer())
        .post(`/resources/${created.body.id}/submit-for-review`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .expect(201);

      const rejected = await request(app.getHttpServer())
        .post(`/resources/${created.body.id}/reject`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ rejectionReason: 'Official source URL is unreachable.' })
        .expect(201);

      expect(rejected.body.verificationStatus).toBe('REJECTED');
      expect(rejected.body.rejectionReason).toBe('Official source URL is unreachable.');
    });
  });

  describe('saved resources — ownership', () => {
    let verifiedResourceId: string;

    beforeAll(async () => {
      const created = await request(app.getHttpServer())
        .post('/resources')
        .set('Authorization', `Bearer ${orgRepToken}`)
        .send(validPayload({ title: `${markerTitlePrefix}Saveable` }))
        .expect(201);
      verifiedResourceId = created.body.id;

      await request(app.getHttpServer())
        .post(`/resources/${verifiedResourceId}/submit-for-review`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/resources/${verifiedResourceId}/verify`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .expect(201);
    });

    it('rejects unauthenticated access', async () => {
      await request(app.getHttpServer())
        .post(`/users/${memberId}/saved-resources`)
        .send({ resourceId: verifiedResourceId })
        .expect(401);
    });

    it('rejects a caller managing another user\'s saved list', async () => {
      await request(app.getHttpServer())
        .post(`/users/${memberId}/saved-resources`)
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .send({ resourceId: verifiedResourceId })
        .expect(403);
    });

    it('allows a member to save and list their own resource', async () => {
      await request(app.getHttpServer())
        .post(`/users/${memberId}/saved-resources`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ resourceId: verifiedResourceId, isFavorite: true })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get(`/users/${memberId}/saved-resources`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(list.body.some((s: { resourceId: string }) => s.resourceId === verifiedResourceId)).toBe(true);
    });

    it('removes a saved resource', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${memberId}/saved-resources/${verifiedResourceId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(204);
    });
  });
});
