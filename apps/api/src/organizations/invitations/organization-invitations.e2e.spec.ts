import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * End-to-end test: the Step 1 — Business Identity & Boundary invitation
 * lifecycle (§8) through real HTTP — invite, list-mine, accept, decline,
 * revoke, expiry, replay protection, and cross-tenant isolation.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('Organization Invitations — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const marker = `e2e-inv-${randomUUID()}`;
  const orgNamePrefix = `E2E-INV-${randomUUID()}-`;

  const tokenFor = (id: string, email: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email, roles });

  let ownerId: string;
  let ownerEmail: string;
  let ownerToken: string;

  // This suite registers many accounts across many `it` blocks sharing one
  // IP, legitimately exceeding AUTH_THROTTLE (5 req/60s) — which is tested
  // at the unit level, not here. Overriding the storage backend it reads
  // from (rather than the globally-bound ThrottlerGuard itself, which
  // NestJS's override mechanisms don't reliably reach) is the one override
  // guaranteed to apply. Mirrors auth.e2e.spec.ts's identical rig.
  const unthrottledStorage: ThrottlerStorage = {
    increment: async (): Promise<ThrottlerStorageRecord> => ({
      totalHits: 1,
      timeToExpire: 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue(unthrottledStorage)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    ownerEmail = `owner-${marker}@example.test`;
    const ownerReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: ownerEmail, password: 'Str0ng!Passw0rd' })
      .expect(201);
    ownerId = ownerReg.body.user.id;
    ownerToken = tokenFor(ownerId, ownerEmail, [UserRole.BUSINESS_REPRESENTATIVE]);
  });

  afterAll(async () => {
    await prisma.db.organization.deleteMany({ where: { name: { startsWith: orgNamePrefix } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: marker } } });
    await app.close();
  });

  async function registerUser(
    label: string,
  ): Promise<{ id: string; email: string; token: string }> {
    const email = `${label}-${marker}@example.test`;
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Passw0rd' })
      .expect(201);
    const id = res.body.user.id;
    return { id, email, token: tokenFor(id, email, [UserRole.MEMBER]) };
  }

  async function createBusiness(name: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name,
        shortDescription: 'S',
        fullDescription: 'A full description of the business workspace.',
        organizationType: 'BUSINESS',
        websiteUrl: 'https://example.test',
      })
      .expect(201);
    return res.body.id;
  }

  describe('invite → list-mine → accept (Flow B/C)', () => {
    let orgId: string;
    let employee: { id: string; email: string; token: string };

    beforeAll(async () => {
      orgId = await createBusiness(`${orgNamePrefix}ABC Kitchen & Bath`);
      employee = await registerUser('employee');
    });

    it('forbids a plain (non-manager) member from inviting', async () => {
      const outsider = await registerUser('outsider-invite');
      await request(app.getHttpServer())
        .post(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .send({ email: employee.email })
        .expect(403);
    });

    it('creates a PENDING invitation as the OWNER', async () => {
      const res = await request(app.getHttpServer())
        .post(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: employee.email, role: 'MEMBER' })
        .expect(201);

      expect(res.body).toMatchObject({
        invitedEmail: employee.email,
        role: 'MEMBER',
        status: 'PENDING',
      });
    });

    it('rejects a duplicate pending invitation to the same email', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: employee.email })
        .expect(409);
    });

    it('does not appear for an unrelated account checking their own invitations', async () => {
      const outsider = await registerUser('outsider-mine');
      const res = await request(app.getHttpServer())
        .get('/invitations/mine')
        .set('Authorization', `Bearer ${outsider.token}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it("appears for the invited account's own /invitations/mine", async () => {
      const res = await request(app.getHttpServer())
        .get('/invitations/mine')
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(200);

      expect(res.body).toEqual([
        expect.objectContaining({
          organizationId: orgId,
          invitedEmail: employee.email,
          organizationName: expect.stringContaining('ABC Kitchen & Bath'),
        }),
      ]);
    });

    it('forbids acceptance by an account whose email does not match the invitation', async () => {
      const outsider = await registerUser('outsider-accept');
      const invitation = (
        await request(app.getHttpServer())
          .get('/invitations/mine')
          .set('Authorization', `Bearer ${employee.token}`)
          .expect(200)
      ).body[0];

      await request(app.getHttpServer())
        .post(`/invitations/${invitation.id}/accept`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .expect(403);
    });

    it('accepts the invitation and grants Business membership (Flow C)', async () => {
      const invitation = (
        await request(app.getHttpServer())
          .get('/invitations/mine')
          .set('Authorization', `Bearer ${employee.token}`)
          .expect(200)
      ).body[0];

      const accepted = await request(app.getHttpServer())
        .post(`/invitations/${invitation.id}/accept`)
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(201);
      expect(accepted.body.status).toBe('ACCEPTED');

      const members = await request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(200);
      expect(members.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ userId: employee.id, role: 'MEMBER' })]),
      );

      // "Business" now appears under this member's own experience.
      const myTenants = await request(app.getHttpServer())
        .get('/business-console/tenants')
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(200);
      expect(myTenants.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: orgId })]),
      );
    });

    it('rejects accepting the same invitation twice (replay protection)', async () => {
      const invitation = await prisma.db.organizationInvitation.findFirst({
        where: { organizationId: orgId, invitedEmail: employee.email },
      });
      await request(app.getHttpServer())
        .post(`/invitations/${invitation!.id}/accept`)
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(409);
    });

    it("no longer appears in the invited account's pending list once resolved", async () => {
      const res = await request(app.getHttpServer())
        .get('/invitations/mine')
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('revocation (Flow E) and decline', () => {
    let orgId: string;
    let otherOrgId: string;
    let invitee: { id: string; email: string; token: string };

    beforeAll(async () => {
      orgId = await createBusiness(`${orgNamePrefix}Revocation Co`);
      otherOrgId = await createBusiness(`${orgNamePrefix}Other Co`);
      invitee = await registerUser('invitee-revoke');
    });

    it('forbids a non-manager from revoking', async () => {
      const invited = await request(app.getHttpServer())
        .post(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: invitee.email })
        .expect(201);

      const outsider = await registerUser('outsider-revoke');
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}/invitations/${invited.body.id}`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .expect(403);
    });

    it("treats another organization's invitation id as not found (cross-tenant isolation)", async () => {
      const invited = await request(app.getHttpServer())
        .get(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const invitationId = invited.body[0].id;

      // otherOrgId is a real, VERIFIED business the same caller owns — the
      // invitation nonetheless belongs to `orgId`, not `otherOrgId`.
      await request(app.getHttpServer())
        .delete(`/organizations/${otherOrgId}/invitations/${invitationId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('revokes the pending invitation as OWNER', async () => {
      const invited = await request(app.getHttpServer())
        .get(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const invitationId = invited.body[0].id;

      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}/invitations/${invitationId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    });

    it('rejects accepting a revoked invitation', async () => {
      const invitation = await prisma.db.organizationInvitation.findFirst({
        where: { organizationId: orgId, invitedEmail: invitee.email },
      });
      await request(app.getHttpServer())
        .post(`/invitations/${invitation!.id}/accept`)
        .set('Authorization', `Bearer ${invitee.token}`)
        .expect(409);

      const members = await request(app.getHttpServer())
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(members.body).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ userId: invitee.id })]),
      );
    });

    it('supports decline, after which the invitation cannot be accepted', async () => {
      const declineeEmail = `declinee-${marker}@example.test`;
      const declineeReg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: declineeEmail, password: 'Str0ng!Passw0rd' })
        .expect(201);
      const declineeToken = tokenFor(declineeReg.body.user.id, declineeEmail, [UserRole.MEMBER]);

      const invited = await request(app.getHttpServer())
        .post(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: declineeEmail })
        .expect(201);

      const declined = await request(app.getHttpServer())
        .post(`/invitations/${invited.body.id}/decline`)
        .set('Authorization', `Bearer ${declineeToken}`)
        .expect(201);
      expect(declined.body.status).toBe('DECLINED');

      await request(app.getHttpServer())
        .post(`/invitations/${invited.body.id}/accept`)
        .set('Authorization', `Bearer ${declineeToken}`)
        .expect(409);
    });
  });

  describe('expiry', () => {
    it('rejects accepting an invitation past its expiry, marking it EXPIRED', async () => {
      const orgId = await createBusiness(`${orgNamePrefix}Expiry Co`);
      const invitee = await registerUser('invitee-expiry');

      const invited = await request(app.getHttpServer())
        .post(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: invitee.email })
        .expect(201);

      // Simulate the passage of time deterministically rather than waiting
      // out the real 14-day TTL.
      await prisma.db.organizationInvitation.update({
        where: { id: invited.body.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await request(app.getHttpServer())
        .post(`/invitations/${invited.body.id}/accept`)
        .set('Authorization', `Bearer ${invitee.token}`)
        .expect(409);

      const stored = await prisma.db.organizationInvitation.findUnique({
        where: { id: invited.body.id },
      });
      expect(stored!.status).toBe('EXPIRED');
    });
  });

  describe('role restrictions', () => {
    it('rejects inviting someone directly as OWNER', async () => {
      const orgId = await createBusiness(`${orgNamePrefix}Owner Guard Co`);
      const invitee = await registerUser('invitee-owner-guard');

      await request(app.getHttpServer())
        .post(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: invitee.email, role: 'OWNER' })
        .expect(400);
    });

    it('rejects inviting an email that already belongs to a member', async () => {
      const orgId = await createBusiness(`${orgNamePrefix}Existing Member Co`);

      await request(app.getHttpServer())
        .post(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: ownerEmail })
        .expect(409);
    });
  });

  describe('concurrent invitations (Step 1 repair #5 — DB-enforced uniqueness)', () => {
    it(
      'allows exactly one of two truly concurrent invitations to the same org+email to succeed, ' +
        'never both, and persists exactly one PENDING row',
      async () => {
        const orgId = await createBusiness(`${orgNamePrefix}Concurrent Invite Co`);
        const invitee = await registerUser('invitee-concurrent');

        // Fired together, not sequentially: both requests can pass the
        // service's own pre-check before either commits its insert — the
        // race this repair specifically closes at the database boundary.
        const [first, second] = await Promise.all([
          request(app.getHttpServer())
            .post(`/organizations/${orgId}/invitations`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ email: invitee.email }),
          request(app.getHttpServer())
            .post(`/organizations/${orgId}/invitations`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ email: invitee.email }),
        ]);

        const statuses = [first.status, second.status].sort();
        expect(statuses).toEqual([201, 409]);

        const invitations = await prisma.db.organizationInvitation.findMany({
          where: { organizationId: orgId, invitedEmail: invitee.email, status: 'PENDING' },
        });
        expect(invitations).toHaveLength(1);
      },
    );

    it('treats a differently-cased email as the same recipient for concurrency purposes too', async () => {
      const orgId = await createBusiness(`${orgNamePrefix}Concurrent Case Co`);
      const invitee = await registerUser('invitee-case');
      const upperCased = invitee.email.toUpperCase();

      const [first, second] = await Promise.all([
        request(app.getHttpServer())
          .post(`/organizations/${orgId}/invitations`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ email: invitee.email }),
        request(app.getHttpServer())
          .post(`/organizations/${orgId}/invitations`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ email: upperCased }),
      ]);

      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([201, 409]);

      const invitations = await prisma.db.organizationInvitation.findMany({
        where: { organizationId: orgId, status: 'PENDING' },
      });
      expect(invitations).toHaveLength(1);
    });
  });
});
