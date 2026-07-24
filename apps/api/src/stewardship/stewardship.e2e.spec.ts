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
 * Stewardship System (WO-025, PA-012) — relationship lifecycle, capacity,
 * notes, follow-up tasks, recommendations, escalations, and metrics.
 *
 * StewardshipRelationship.memberId/.stewardId and OrganizationMember.userId
 * all carry real FKs to User (mirrors the WO-022 Goal.userId and WO-024
 * OrganizationMember.userId findings), so every persona that becomes a
 * relationship party or org representative is a real registered user with a
 * self-minted token asserting the role needed to pass guard checks.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('Stewardship System — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const emailMarker = `e2e-wo025-${randomUUID()}`;
  const orgNameMarker = `E2E-WO025-ORG-${randomUUID()}-`;

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  const aiId = randomUUID();
  const adminId = randomUUID();
  let aiToken: string;
  let adminToken: string;
  let otherMemberId: string;
  let otherMemberToken: string;

  let memberId: string;
  let memberToken: string;
  let stewardId: string;
  let stewardToken: string;
  let secondStewardId: string;
  let secondStewardToken: string;
  let orgRepId: string;
  let orgRepToken: string;

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

    aiToken = tokenFor(aiId, [UserRole.AI_SERVICE_ACCOUNT]);
    adminToken = tokenFor(adminId, [UserRole.PLATFORM_ADMINISTRATOR]);

    const register = async (label: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `${label}-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
        .expect(201);
      return res.body.user.id as string;
    };

    memberId = await register('member');
    memberToken = tokenFor(memberId, [UserRole.MEMBER]);

    otherMemberId = await register('other-member');
    otherMemberToken = tokenFor(otherMemberId, [UserRole.MEMBER]);

    const grantSteward = async (userId: string) => {
      await request(app.getHttpServer())
        .post(`/users/${userId}/roles/grant`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.STEWARD })
        .expect(201);
    };

    stewardId = await register('steward');
    await grantSteward(stewardId);
    stewardToken = tokenFor(stewardId, [UserRole.STEWARD]);

    secondStewardId = await register('steward2');
    await grantSteward(secondStewardId);
    secondStewardToken = tokenFor(secondStewardId, [UserRole.STEWARD]);

    orgRepId = await register('orgrep');
    orgRepToken = tokenFor(orgRepId, [UserRole.ORGANIZATION_REPRESENTATIVE]);
  });

  afterAll(async () => {
    await prisma.db.organization.deleteMany({ where: { name: { startsWith: orgNameMarker } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).post('/stewardship/relationships/request').send({}).expect(401);
  });

  describe('relationship lifecycle', () => {
    let requestedRelationshipId: string;
    let activeRelationshipId: string;

    it('lets a member request a steward, landing PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post('/stewardship/relationships/request')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({})
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.origin).toBe('MEMBER_REQUEST');
      requestedRelationshipId = res.body.id;
    });

    it('rejects a non-AI caller from recommending a steward', async () => {
      await request(app.getHttpServer())
        .post('/stewardship/relationships/recommend')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ memberId, stewardId })
        .expect(403);
    });

    it('lets an AI service account recommend a steward, landing PENDING (never ACTIVE)', async () => {
      const res = await request(app.getHttpServer())
        .post('/stewardship/relationships/recommend')
        .set('Authorization', `Bearer ${aiToken}`)
        .send({ memberId: otherMemberId, stewardId })
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.origin).toBe('AI_RECOMMENDATION');
    });

    it('rejects a plain member from activating a PENDING relationship', async () => {
      await request(app.getHttpServer())
        .post(`/stewardship/relationships/${requestedRelationshipId}/activate`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ stewardId })
        .expect(403);
    });

    it('lets a Platform Administrator activate the pending request', async () => {
      const res = await request(app.getHttpServer())
        .post(`/stewardship/relationships/${requestedRelationshipId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stewardId })
        .expect(201);

      expect(res.body.status).toBe('ACTIVE');
      activeRelationshipId = requestedRelationshipId;
    });

    it('rejects assigning a steward who is at capacity', async () => {
      await request(app.getHttpServer())
        .patch(`/stewardship/capacities/${stewardId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maxActiveMembers: 1 })
        .expect(200);

      await request(app.getHttpServer())
        .post('/stewardship/relationships/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ memberId: otherMemberId, stewardId })
        .expect(409);

      // Restore generous capacity for the rest of the suite.
      await request(app.getHttpServer())
        .patch(`/stewardship/capacities/${stewardId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maxActiveMembers: 25 })
        .expect(200);
    });

    it('allows the member to read their own relationship; forbids an unrelated caller', async () => {
      await request(app.getHttpServer())
        .get(`/stewardship/relationships/${activeRelationshipId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/stewardship/relationships/${activeRelationshipId}`)
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .expect(403);
    });

    describe('member overview (steward-only)', () => {
      it('forbids the member from viewing their own overview (steward-only view)', async () => {
        await request(app.getHttpServer())
          .get(`/stewardship/relationships/${activeRelationshipId}/member-overview`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);
      });

      it('allows the assigned steward to view the member overview', async () => {
        const res = await request(app.getHttpServer())
          .get(`/stewardship/relationships/${activeRelationshipId}/member-overview`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .expect(200);

        expect(res.body).toEqual(expect.objectContaining({ goals: [], journeys: [], milestones: [], tasks: [] }));
      });

      it("B7: reflects the member's real arrival state — before and after granting consent", async () => {
        const before = await request(app.getHttpServer())
          .get(`/stewardship/relationships/${activeRelationshipId}/member-overview`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .expect(200);

        expect(before.body.arrivalStatus).toEqual({
          consentGranted: false, consentVersion: null, consentGrantedAt: null, hasCreatedFirstGoal: false,
        });

        await request(app.getHttpServer())
          .post(`/users/${memberId}/consent`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ version: 'v1-2026-07' })
          .expect(201);

        const after = await request(app.getHttpServer())
          .get(`/stewardship/relationships/${activeRelationshipId}/member-overview`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .expect(200);

        expect(after.body.arrivalStatus).toEqual(expect.objectContaining({
          consentGranted: true, consentVersion: 'v1-2026-07', hasCreatedFirstGoal: false,
        }));
      });
    });

    describe('notes — private vs shared visibility', () => {
      let privateNoteId: string;

      it('allows the steward to create a PRIVATE note by default', async () => {
        const res = await request(app.getHttpServer())
          .post(`/stewardship/relationships/${activeRelationshipId}/notes`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .send({ content: 'Internal observation, not for the member.' })
          .expect(201);

        expect(res.body.visibility).toBe('PRIVATE');
        privateNoteId = res.body.id;
      });

      it('allows the steward to create a SHARED note', async () => {
        await request(app.getHttpServer())
          .post(`/stewardship/relationships/${activeRelationshipId}/notes`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .send({ content: 'Great progress this week!', visibility: 'SHARED' })
          .expect(201);
      });

      it('the member never sees the PRIVATE note, only the SHARED one', async () => {
        const res = await request(app.getHttpServer())
          .get(`/stewardship/relationships/${activeRelationshipId}/notes`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(res.body.every((n: { visibility: string }) => n.visibility === 'SHARED')).toBe(true);
        expect(res.body.find((n: { id: string }) => n.id === privateNoteId)).toBeUndefined();
      });

      it('the steward sees both notes', async () => {
        const res = await request(app.getHttpServer())
          .get(`/stewardship/relationships/${activeRelationshipId}/notes`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .expect(200);

        expect(res.body.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('follow-up tasks — steward manages, member views', () => {
      let taskId: string;

      it('allows the steward to create a follow-up task', async () => {
        const res = await request(app.getHttpServer())
          .post(`/stewardship/relationships/${activeRelationshipId}/tasks`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .send({ title: 'Update resume' })
          .expect(201);
        taskId = res.body.id;
      });

      it('allows the member to view it but not edit it', async () => {
        const list = await request(app.getHttpServer())
          .get(`/stewardship/relationships/${activeRelationshipId}/tasks`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);
        expect(list.body.some((t: { id: string }) => t.id === taskId)).toBe(true);

        await request(app.getHttpServer())
          .patch(`/stewardship/relationships/${activeRelationshipId}/tasks/${taskId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ status: 'COMPLETED' })
          .expect(403);
      });

      it('allows the steward to update it', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/stewardship/relationships/${activeRelationshipId}/tasks/${taskId}`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .send({ status: 'COMPLETED' })
          .expect(200);
        expect(res.body.status).toBe('COMPLETED');
      });
    });

    describe('escalations — internal, not member-visible', () => {
      let escalationId: string;

      it('allows the steward to raise an escalation', async () => {
        const res = await request(app.getHttpServer())
          .post(`/stewardship/relationships/${activeRelationshipId}/escalations`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .send({ title: 'Access issue', description: 'Member cannot access a recommended benefit portal.' })
          .expect(201);
        escalationId = res.body.id;
      });

      it('forbids the member from viewing escalations', async () => {
        await request(app.getHttpServer())
          .get(`/stewardship/relationships/${activeRelationshipId}/escalations`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);
      });

      it('allows the steward to resolve it', async () => {
        const res = await request(app.getHttpServer())
          .post(`/stewardship/relationships/${activeRelationshipId}/escalations/${escalationId}/resolve`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .send({ resolutionNotes: 'Provider fixed the portal.' })
          .expect(201);
        expect(res.body.status).toBe('RESOLVED');
      });
    });

    describe('metrics', () => {
      it('allows the steward to view their own metrics', async () => {
        const res = await request(app.getHttpServer())
          .get(`/stewardship/metrics/${stewardId}`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .expect(200);

        expect(res.body.activeMemberCount).toBeGreaterThanOrEqual(1);
        expect(res.body.tasksCompleted).toBeGreaterThanOrEqual(1);
        expect(res.body.escalationsResolved).toBeGreaterThanOrEqual(1);
      });

      it('forbids another steward from viewing someone else\'s metrics', async () => {
        await request(app.getHttpServer())
          .get(`/stewardship/metrics/${stewardId}`)
          .set('Authorization', `Bearer ${secondStewardToken}`)
          .expect(403);
      });
    });

    it('lets the member end the relationship themselves (MEMBER_REQUEST)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/stewardship/relationships/${activeRelationshipId}/end`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ reason: 'MEMBER_REQUEST' })
        .expect(201);
      expect(res.body.status).toBe('ENDED');

      await request(app.getHttpServer())
        .post(`/stewardship/relationships/${activeRelationshipId}/end`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ reason: 'MEMBER_REQUEST' })
        .expect(409);
    });
  });

  describe('organization assignment and reassignment', () => {
    let organizationId: string;
    let relationshipId: string;

    it('creates a verified organization for the org rep to act on behalf of', async () => {
      const created = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${orgRepToken}`)
        .send({
          name: `${orgNameMarker}Community Partners`,
          shortDescription: 'desc', fullDescription: 'A full description of the organization for testing.',
          organizationType: 'NONPROFIT', websiteUrl: 'https://example.test',
        })
        .expect(201);
      organizationId = created.body.id;

      await request(app.getHttpServer())
        .post(`/organizations/${organizationId}/submit-for-review`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/organizations/${organizationId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
    });

    it('allows the org ADMIN representative to assign a steward, effective immediately', async () => {
      const res = await request(app.getHttpServer())
        .post('/stewardship/relationships/assign-by-organization')
        .set('Authorization', `Bearer ${orgRepToken}`)
        .send({ memberId, stewardId, organizationId })
        .expect(201);

      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.assignedByOrganizationId).toBe(organizationId);
      relationshipId = res.body.id;
    });

    it('reassigns the member to a new steward via organization authority, preserving history', async () => {
      const res = await request(app.getHttpServer())
        .post(`/stewardship/relationships/${relationshipId}/reassign`)
        .set('Authorization', `Bearer ${orgRepToken}`)
        .send({ newStewardId: secondStewardId, reason: 'ORGANIZATION_REASSIGNMENT', organizationId })
        .expect(201);

      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.stewardId).toBe(secondStewardId);
      expect(res.body.id).not.toBe(relationshipId);

      const oldRelationship = await request(app.getHttpServer())
        .get(`/stewardship/relationships/${relationshipId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(oldRelationship.body.status).toBe('ENDED');
      expect(oldRelationship.body.endReason).toBe('ORGANIZATION_REASSIGNMENT');
    });
  });
});
