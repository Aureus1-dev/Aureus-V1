import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';
import { V1_FEATURE_FLAGS } from '../config/v1-feature-scope';

/**
 * End-to-end test: boots the full Nest application and exercises the Pods
 * domain (WO-030, PA-009) golden path across sub-domains — Pod lifecycle,
 * institutional Steward appointment, invitations, events/RSVP/attendance,
 * meeting schedule, service projects, requests, escalations, metrics, and
 * messaging — verifying the constitutional invariants approved during
 * Founder Review, not merely the happy path.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('Pods — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const emailMarker = `e2e-wo030-${randomUUID()}`;

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  const aiId = randomUUID();
  const adminId = randomUUID();
  let aiToken: string;
  let adminToken: string;

  let member1Id: string;
  let member1Token: string;
  let member2Id: string;
  let member2Token: string;
  let outsiderId: string;
  let outsiderToken: string;

  let podId: string;
  let membershipMember1Id: string;
  let membershipMember2Id: string;

  beforeAll(async () => {
    // C2 — V1 Scope Lockdown gates /pods off by default (LAUNCH-001:
    // "No Pods, no Academy"). Flipped on for this suite only, so it keeps
    // proving the underlying domain works end-to-end — restored in
    // afterAll so no other suite observes it.
    V1_FEATURE_FLAGS.pods = true;

    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

    member1Id = await register('member1');
    member1Token = tokenFor(member1Id, [UserRole.MEMBER]);
    member2Id = await register('member2');
    member2Token = tokenFor(member2Id, [UserRole.MEMBER]);
    outsiderId = await register('outsider');
    outsiderToken = tokenFor(outsiderId, [UserRole.MEMBER]);
  });

  afterAll(async () => {
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
    V1_FEATURE_FLAGS.pods = false;
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).post('/pods').send({}).expect(401);
  });

  describe('Pod lifecycle + Institutional Appointment (Founder Decision #2)', () => {
    it('a Steward-role user creates a FORMING Pod', async () => {
      const res = await request(app.getHttpServer())
        .post('/pods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Riverside Home Pod', shortDescription: 'A local community', fullDescription: 'A Home Pod for the Riverside area.', type: 'HOME', city: 'Austin' })
        .expect(201);
      podId = res.body.id;
      expect(res.body.status).toBe('FORMING');
    });

    it('a member requests to JOIN the new Pod (always reviewed, never auto-applied)', async () => {
      const res = await request(app.getHttpServer())
        .post('/pods/requests')
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ type: 'JOIN', podId })
        .expect(201);
      expect(res.body.status).toBe('PENDING');
    });

    it('an Admin approves the JOIN request, activating the membership', async () => {
      const list = await request(app.getHttpServer())
        .get(`/pods/requests/for-pod/${podId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const reqId = list.body[0].id;
      await request(app.getHttpServer())
        .post(`/pods/requests/${reqId}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approve: true })
        .expect(201);

      const roster = await request(app.getHttpServer())
        .get(`/pods/${podId}/memberships`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(roster.body).toHaveLength(1);
      membershipMember1Id = roster.body[0].id;
      expect(roster.body[0].role).toBe('MEMBER');
    });

    it('only Institutional Appointment (Admin) may promote a member to Pod Steward', async () => {
      await request(app.getHttpServer())
        .post(`/pods/memberships/${membershipMember1Id}/role`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ role: 'STEWARD' })
        .expect(403);

      const res = await request(app.getHttpServer())
        .post(`/pods/memberships/${membershipMember1Id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'STEWARD' })
        .expect(201);
      expect(res.body.role).toBe('STEWARD');
    });

    it('the new Steward activates the Pod', async () => {
      const res = await request(app.getHttpServer())
        .post(`/pods/${podId}/activate`)
        .set('Authorization', `Bearer ${member1Token}`)
        .expect(201);
      expect(res.body.status).toBe('ACTIVE');
    });
  });

  describe('Invitations — split by type (Founder Decision #3)', () => {
    it('a non-Steward may not invite to this HOME Pod', async () => {
      await request(app.getHttpServer())
        .post(`/pods/${podId}/invitations`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ invitedUserId: member2Id })
        .expect(403);
    });

    it('the Pod Steward invites member2 to the Home Pod', async () => {
      const res = await request(app.getHttpServer())
        .post(`/pods/${podId}/invitations`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ invitedUserId: member2Id, message: 'Welcome!' })
        .expect(201);
      expect(res.body.status).toBe('PENDING');
    });

    it('member2 accepts, becoming an ACTIVE member', async () => {
      const mine = await request(app.getHttpServer())
        .get('/pods/invitations/mine')
        .set('Authorization', `Bearer ${member2Token}`)
        .expect(200);
      const invId = mine.body[0].id;
      await request(app.getHttpServer())
        .post(`/pods/invitations/${invId}/respond`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({ decision: 'ACCEPT' })
        .expect(201);

      const roster = await request(app.getHttpServer())
        .get(`/pods/${podId}/memberships`)
        .set('Authorization', `Bearer ${member1Token}`)
        .expect(200);
      expect(roster.body).toHaveLength(2);
      membershipMember2Id = roster.body.find((m: { userId: string }) => m.userId === member2Id).id;
    });
  });

  describe('Meeting schedule, events, RSVP, attendance (Founder Decisions #5, #10)', () => {
    it('the Steward sets the recurring schedule — informational only', async () => {
      const res = await request(app.getHttpServer())
        .put(`/pods/${podId}/meeting-schedule`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ cadence: 'BIWEEKLY', dayOfWeek: 3, timeOfDay: '19:00', location: 'Community Center', durationMinutes: 90 })
        .expect(200);
      expect(res.body.location).toBe('Community Center');
    });

    let eventId: string;
    it('the Steward creates a meeting (never auto-generated)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/pods/${podId}/events`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ title: 'Weekly Gathering', startsAt: new Date(Date.now() + 86400000).toISOString() })
        .expect(201);
      eventId = res.body.id;
      expect(res.body.status).toBe('SCHEDULED');
    });

    it('member2 RSVPs — visible to fellow members', async () => {
      await request(app.getHttpServer())
        .post(`/pods/events/${eventId}/rsvp`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({ response: 'YES' })
        .expect(201);

      const rsvps = await request(app.getHttpServer())
        .get(`/pods/events/${eventId}/rsvps`)
        .set('Authorization', `Bearer ${member2Token}`)
        .expect(200);
      expect(rsvps.body[0]).not.toHaveProperty('attended');
    });

    it('only the Steward may mark attendance after the fact', async () => {
      await request(app.getHttpServer())
        .post(`/pods/events/${eventId}/attendance`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({ userId: member2Id, attended: true })
        .expect(403);

      await request(app.getHttpServer())
        .post(`/pods/events/${eventId}/attendance`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ userId: member2Id, attended: true })
        .expect(201);
    });
  });

  describe('Service projects — Article IX, any active member may propose', () => {
    it('member2 proposes a service project without being Steward', async () => {
      const res = await request(app.getHttpServer())
        .post(`/pods/${podId}/service-projects`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({ title: 'Food Pantry', description: 'Who needs us? A local food pantry needs weekend volunteers.' })
        .expect(201);
      expect(res.body.status).toBe('PROPOSED');
    });
  });

  describe('Escalations — confidential care-request, any active member may raise (Founder Decision #4)', () => {
    it('member2 may raise a concern about the Steward themselves', async () => {
      await request(app.getHttpServer())
        .post(`/pods/${podId}/escalations`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({ title: 'A concern', description: 'A confidential concern about how a recent meeting was run.' })
        .expect(201);
    });

    it('an outsider (non-member) may not raise a concern about this Pod', async () => {
      await request(app.getHttpServer())
        .post(`/pods/${podId}/escalations`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ title: 'X', description: 'Some long enough description here' })
        .expect(403);
    });

    it('escalations are never visible to the general membership — only the Steward/Admin', async () => {
      await request(app.getHttpServer())
        .get(`/pods/${podId}/escalations`)
        .set('Authorization', `Bearer ${member2Token}`)
        .expect(403);

      const res = await request(app.getHttpServer())
        .get(`/pods/${podId}/escalations`)
        .set('Authorization', `Bearer ${member1Token}`)
        .expect(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics — aggregate, Pod-level only (§1.10, §6)', () => {
    it('an outsider cannot read Pod metrics', async () => {
      await request(app.getHttpServer())
        .get(`/pods/${podId}/metrics`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('the Steward reads aggregate metrics with no per-member breakdown', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pods/${podId}/metrics`)
        .set('Authorization', `Bearer ${member1Token}`)
        .expect(200);
      expect(res.body.activeMemberCount).toBe(2);
      expect(res.body).not.toHaveProperty('members');
    });
  });

  describe('Messaging — reuses Conversation directly (§1.6)', () => {
    it('a Pod member can start/get the single group conversation thread', async () => {
      const res = await request(app.getHttpServer())
        .post(`/pods/${podId}/conversation`)
        .set('Authorization', `Bearer ${member2Token}`)
        .expect(201);
      expect(res.body.type).toBe('POD');
    });

    it('a non-member cannot start the conversation', async () => {
      await request(app.getHttpServer())
        .post(`/pods/${podId}/conversation`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });
  });

  describe('AI Match Suggestion — never assigns (Founder Decision #1)', () => {
    it('rejects a non-AI-service-account, non-Admin caller', async () => {
      await request(app.getHttpServer())
        .post('/pods/memberships/suggest-home-pod')
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ userId: outsiderId })
        .expect(403);
    });

    it('an AI service account may prepare a PENDING (never ACTIVE) invitation', async () => {
      const res = await request(app.getHttpServer())
        .post('/pods/memberships/suggest-home-pod')
        .set('Authorization', `Bearer ${aiToken}`)
        .send({ userId: outsiderId })
        .expect(201);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.origin).toBe('AI_MATCH_SUGGESTION');
    });
  });

  describe('Leaving — self-service, no approval gate (Article VIII)', () => {
    it('member2 leaves immediately', async () => {
      const res = await request(app.getHttpServer())
        .post(`/pods/memberships/${membershipMember2Id}/leave`)
        .set('Authorization', `Bearer ${member2Token}`)
        .expect(201);
      expect(res.body.status).toBe('ENDED');
    });
  });

  describe('PROPOSE_NEW_POD — the proposer is never automatically the Steward (Founder Decision #2)', () => {
    it('an approved proposal creates a new Pod with the proposer as an ordinary member', async () => {
      const propose = await request(app.getHttpServer())
        .post('/pods/requests')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ type: 'PROPOSE_NEW_POD', proposedPodName: 'Hikers Interest Pod', proposedPodDescription: 'A community for members who love hiking together.' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/pods/requests/${propose.body.id}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approve: true })
        .expect(201);

      const decided = await request(app.getHttpServer())
        .get('/pods/requests/mine')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(200);
      const newPodId = decided.body.find((r: { type: string }) => r.type === 'PROPOSE_NEW_POD').podId;

      const roster = await request(app.getHttpServer())
        .get(`/pods/${newPodId}/memberships`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(roster.body).toHaveLength(1);
      expect(roster.body[0].role).toBe('MEMBER');
    });
  });
});
