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
 * exercises the Business Portal (WO-024) — organization profiles,
 * verification workflow, and membership management — through Supertest.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET to be set (see test/jest.setup.js).
 */
describe('Organizations (Business Portal) — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const markerNamePrefix = `E2E-WO024-${randomUUID()}-`;

  // OrganizationMember.userId carries a real FK to User (a genuine
  // membership relation, unlike Resource/Opportunity's loose ownerId audit
  // pointers) — so any persona that will actually become a member must be a
  // real registered user, not a synthetic UUID (mirrors the WO-022 finding
  // for Goal.userId). Steward/Admin/plain-Member never join a membership row
  // (they act purely via role-based override), so those stay synthetic.
  const emailMarker = `e2e-wo024-${randomUUID()}`;
  const stewardId = randomUUID();
  const adminId = randomUUID();
  const memberId = randomUUID();

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  let orgRepId: string;
  let otherRepId: string;
  let orgRepToken: string;
  let otherRepToken: string;
  let stewardToken: string;
  let adminToken: string;
  let memberToken: string;

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

    const orgRepReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `orgrep-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    orgRepId = orgRepReg.body.user.id;

    const otherRepReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `otherrep-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    otherRepId = otherRepReg.body.user.id;

    // Self-minted tokens (same technique used for every synthetic persona
    // elsewhere) asserting the ORGANIZATION_REPRESENTATIVE role needed to
    // pass CREATOR_ROLES, while pointing at the real registered user IDs
    // above so the OrganizationMember FK resolves.
    orgRepToken = tokenFor(orgRepId, [UserRole.ORGANIZATION_REPRESENTATIVE]);
    otherRepToken = tokenFor(otherRepId, [UserRole.ORGANIZATION_REPRESENTATIVE]);
    stewardToken = tokenFor(stewardId, [UserRole.STEWARD]);
    adminToken = tokenFor(adminId, [UserRole.PLATFORM_ADMINISTRATOR]);
    memberToken = tokenFor(memberId, [UserRole.MEMBER]);
  });

  afterAll(async () => {
    await prisma.db.organization.deleteMany({ where: { name: { startsWith: markerNamePrefix } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
  });

  const validPayload = (overrides: Record<string, unknown> = {}) => ({
    name: `${markerNamePrefix}Community Legal Aid`,
    shortDescription: 'Free legal consultations for residents',
    fullDescription: 'A full description of the legal aid services offered by this organization.',
    organizationType: 'NONPROFIT',
    websiteUrl: 'https://legalaid.example.org',
    ...overrides,
  });

  it('rejects organization creation with no token', async () => {
    await request(app.getHttpServer()).post('/organizations').send(validPayload()).expect(401);
  });

  it('rejects organization creation for a caller without a creator role', async () => {
    await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(validPayload())
      .expect(403);
  });

  it('rejects creation with invalid payload (400, structured error)', async () => {
    const res = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${orgRepToken}`)
      .send({ name: 'x' })
      .expect(400);

    expect(res.body).toMatchObject({ statusCode: 400 });
  });

  describe('full lifecycle', () => {
    let orgId: string;
    let orgRef: string;

    it('creates a DRAFT organization; the creator becomes its first ADMIN representative', async () => {
      const res = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${orgRepToken}`)
        .send(validPayload())
        .expect(201);

      expect(res.body.status).toBe('DRAFT');
      expect(res.body.verificationStatus).toBe('DRAFT');
      expect(res.body.organizationRef).toMatch(/^AUR-ORG-\d{6}$/);

      orgId = res.body.id;
      orgRef = res.body.organizationRef;

      const members = await request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .expect(200);
      expect(members.body).toEqual([
        expect.objectContaining({ userId: orgRepId, role: 'ADMIN' }),
      ]);
    });

    it('excludes DRAFT organizations from the default public listing', async () => {
      const res = await request(app.getHttpServer())
        .get('/organizations')
        .query({ q: markerNamePrefix })
        .expect(200);

      expect(res.body.data.find((o: { id: string }) => o.id === orgId)).toBeUndefined();
    });

    it('allows direct lookup by id and by ref regardless of verification status', async () => {
      const byId = await request(app.getHttpServer()).get(`/organizations/${orgId}`).expect(200);
      expect(byId.body.id).toBe(orgId);

      const byRef = await request(app.getHttpServer()).get(`/organizations/by-ref/${orgRef}`).expect(200);
      expect(byRef.body.id).toBe(orgId);
    });

    it('forbids a non-member representative from updating the organization', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}`)
        .set('Authorization', `Bearer ${otherRepToken}`)
        .send({ shortDescription: 'Hijacked' })
        .expect(403);
    });

    it('allows the ADMIN representative to update their own organization', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .send({ shortDescription: 'Updated short description' })
        .expect(200);

      expect(res.body.shortDescription).toBe('Updated short description');
    });

    it('moves DRAFT → PENDING_REVIEW when an ADMIN representative submits for review', async () => {
      const res = await request(app.getHttpServer())
        .post(`/organizations/${orgId}/submit-for-review`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .expect(201);

      expect(res.body.verificationStatus).toBe('PENDING_REVIEW');
    });

    it('forbids a non-Steward/Admin from verifying', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/${orgId}/verify`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .expect(403);
    });

    it('allows a Steward to verify PENDING_REVIEW → VERIFIED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/organizations/${orgId}/verify`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .expect(201);

      expect(res.body.verificationStatus).toBe('VERIFIED');
      expect(res.body.status).toBe('ACTIVE');
    });

    it('now appears in the default public (VERIFIED) listing', async () => {
      const res = await request(app.getHttpServer())
        .get('/organizations')
        .query({ q: markerNamePrefix })
        .expect(200);

      expect(res.body.data.some((o: { id: string }) => o.id === orgId)).toBe(true);
    });

    describe('membership management', () => {
      it('forbids a non-ADMIN member from adding a representative', async () => {
        await request(app.getHttpServer())
          .post(`/organizations/${orgId}/members`)
          .set('Authorization', `Bearer ${otherRepToken}`)
          .send({ userId: memberId })
          .expect(403);
      });

      it('allows the ADMIN representative to add a member', async () => {
        const res = await request(app.getHttpServer())
          .post(`/organizations/${orgId}/members`)
          .set('Authorization', `Bearer ${orgRepToken}`)
          .send({ userId: otherRepId, role: 'MEMBER' })
          .expect(201);

        expect(res.body.role).toBe('MEMBER');
      });

      it('rejects adding the same user twice', async () => {
        await request(app.getHttpServer())
          .post(`/organizations/${orgId}/members`)
          .set('Authorization', `Bearer ${orgRepToken}`)
          .send({ userId: otherRepId })
          .expect(409);
      });

      it('forbids a non-member from listing members', async () => {
        await request(app.getHttpServer())
          .get(`/organizations/${orgId}/members`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);
      });

      it('allows a plain MEMBER representative to list members but not manage them', async () => {
        await request(app.getHttpServer())
          .get(`/organizations/${orgId}/members`)
          .set('Authorization', `Bearer ${otherRepToken}`)
          .expect(200);

        await request(app.getHttpServer())
          .patch(`/organizations/${orgId}/members/${orgRepId}`)
          .set('Authorization', `Bearer ${otherRepToken}`)
          .send({ role: 'MEMBER' })
          .expect(403);
      });

      it("prevents demoting the organization's last remaining ADMIN", async () => {
        await request(app.getHttpServer())
          .patch(`/organizations/${orgId}/members/${orgRepId}`)
          .set('Authorization', `Bearer ${orgRepToken}`)
          .send({ role: 'MEMBER' })
          .expect(409);
      });

      it('allows the ADMIN to promote another member, then step down safely', async () => {
        await request(app.getHttpServer())
          .patch(`/organizations/${orgId}/members/${otherRepId}`)
          .set('Authorization', `Bearer ${orgRepToken}`)
          .send({ role: 'ADMIN' })
          .expect(200);

        await request(app.getHttpServer())
          .patch(`/organizations/${orgId}/members/${orgRepId}`)
          .set('Authorization', `Bearer ${orgRepToken}`)
          .send({ role: 'MEMBER' })
          .expect(200);
      });

      it('allows a member to remove themselves', async () => {
        await request(app.getHttpServer())
          .delete(`/organizations/${orgId}/members/${orgRepId}`)
          .set('Authorization', `Bearer ${orgRepToken}`)
          .expect(204);
      });

      it("prevents removing the organization's last remaining ADMIN", async () => {
        await request(app.getHttpServer())
          .delete(`/organizations/${orgId}/members/${otherRepId}`)
          .set('Authorization', `Bearer ${otherRepToken}`)
          .expect(409);
      });
    });

    it('allows the owner to soft-delete, after which it 404s', async () => {
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .set('Authorization', `Bearer ${otherRepToken}`)
        .expect(204);

      await request(app.getHttpServer()).get(`/organizations/${orgId}`).expect(404);
    });
  });

  describe('rejection workflow', () => {
    it('rejects a PENDING_REVIEW organization with a reason', async () => {
      const created = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${orgRepToken}`)
        .send(validPayload({ name: `${markerNamePrefix}To Reject` }))
        .expect(201);

      await request(app.getHttpServer())
        .post(`/organizations/${created.body.id}/submit-for-review`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .expect(201);

      const rejected = await request(app.getHttpServer())
        .post(`/organizations/${created.body.id}/reject`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ rejectionReason: 'Unable to verify legal organization status.' })
        .expect(201);

      expect(rejected.body.verificationStatus).toBe('REJECTED');
      expect(rejected.body.rejectionReason).toBe('Unable to verify legal organization status.');
    });
  });

  describe('administrator override', () => {
    it('allows an Admin to archive regardless of membership', async () => {
      const created = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${orgRepToken}`)
        .send(validPayload({ name: `${markerNamePrefix}Admin Archive` }))
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/organizations/${created.body.id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.status).toBe('ARCHIVED');
    });
  });
});
