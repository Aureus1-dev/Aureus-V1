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
 * Communication System (WO-026, PA-015) — notification delivery via
 * announcement fan-out, preference enforcement, announcement authorization
 * and lifecycle, stewardship messaging, and cross-user/cross-organization
 * isolation.
 *
 * `StewardshipRelationship.memberId`/`.stewardId`, `ConversationParticipant.
 * userId`, and `Notification.recipientId` all carry real FKs to `User`
 * (mirrors the WO-022/024/025 findings), so every persona that becomes a
 * relationship party, conversation participant, or notification recipient
 * is a real registered user. The `steward` persona additionally needs the
 * STEWARD role granted for real via the WO-021 role-grant endpoint — a
 * self-minted JWT claim alone satisfies `RolesGuard` but not Stewardship's
 * `assertHoldsStewardRole`, which queries the persisted `User.roles` array
 * (discovered during WO-025).
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('Communication System — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const emailMarker = `e2e-wo026-${randomUUID()}`;
  const orgNameMarker = `E2E-WO026-ORG-${randomUUID()}-`;

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  const adminId = randomUUID();
  let adminToken: string;

  let memberId: string;
  let memberToken: string;
  let stewardId: string;
  let stewardToken: string;
  let otherMemberId: string;
  let otherMemberToken: string;
  let orgRepAId: string;
  let orgRepAToken: string;
  let orgRepBId: string;
  let orgRepBToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    adminToken = tokenFor(adminId, [UserRole.PLATFORM_ADMINISTRATOR]);

    const register = async (label: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `${label}-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
        .expect(201);
      return res.body.user.id as string;
    };
    const grantSteward = async (userId: string) => {
      await request(app.getHttpServer())
        .post(`/users/${userId}/roles/grant`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.STEWARD })
        .expect(201);
    };

    memberId = await register('member');
    memberToken = tokenFor(memberId, [UserRole.MEMBER]);

    otherMemberId = await register('other-member');
    otherMemberToken = tokenFor(otherMemberId, [UserRole.MEMBER]);

    stewardId = await register('steward');
    await grantSteward(stewardId);
    stewardToken = tokenFor(stewardId, [UserRole.STEWARD]);

    orgRepAId = await register('orgrep-a');
    orgRepAToken = tokenFor(orgRepAId, [UserRole.ORGANIZATION_REPRESENTATIVE]);
    orgRepBId = await register('orgrep-b');
    orgRepBToken = tokenFor(orgRepBId, [UserRole.ORGANIZATION_REPRESENTATIVE]);
  });

  afterAll(async () => {
    await prisma.db.organization.deleteMany({ where: { name: { startsWith: orgNameMarker } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/communications/notifications').expect(401);
  });

  describe('announcements — authorization, lifecycle, and notification fan-out', () => {
    let platformAnnouncementId: string;

    it('rejects a plain member from creating a PLATFORM announcement', async () => {
      await request(app.getHttpServer())
        .post('/communications/announcements')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'x', body: 'y', scope: 'PLATFORM' })
        .expect(403);
    });

    it('lets a Platform Administrator create a DRAFT PLATFORM announcement', async () => {
      const res = await request(app.getHttpServer())
        .post('/communications/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Platform maintenance window', body: 'Aureus will be briefly unavailable on Sunday.', scope: 'PLATFORM' })
        .expect(201);
      expect(res.body.status).toBe('DRAFT');
      platformAnnouncementId = res.body.id;
    });

    it('is not visible to a member while still DRAFT', async () => {
      await request(app.getHttpServer())
        .get(`/communications/announcements/${platformAnnouncementId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('rejects a plain member from publishing it', async () => {
      await request(app.getHttpServer())
        .post(`/communications/announcements/${platformAnnouncementId}/publish`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('publishes the announcement, creating a notification for every ACTIVE user (including the member)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/communications/announcements/${platformAnnouncementId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(res.body.status).toBe('PUBLISHED');

      const list = await request(app.getHttpServer())
        .get('/communications/notifications?category=ANNOUNCEMENT')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(list.body.data.some((n: { title: string }) => n.title === 'Platform maintenance window')).toBe(true);
    });

    it('is now visible to the member (published + audience)', async () => {
      await request(app.getHttpServer())
        .get(`/communications/announcements/${platformAnnouncementId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });

    it('rejects republishing an already-PUBLISHED announcement', async () => {
      await request(app.getHttpServer())
        .post(`/communications/announcements/${platformAnnouncementId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });
  });

  describe('notification read state and delivery tracking', () => {
    let notificationId: string;

    it('finds the fanned-out notification and records honest delivery status (IN_APP DELIVERED)', async () => {
      const list = await request(app.getHttpServer())
        .get('/communications/notifications?category=ANNOUNCEMENT&unreadOnly=true')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(list.body.data.length).toBeGreaterThan(0);
      notificationId = list.body.data[0].id;

      const detail = await request(app.getHttpServer())
        .get(`/communications/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      const inApp = detail.body.deliveries.find((d: { channel: string }) => d.channel === 'IN_APP');
      expect(inApp.status).toBe('DELIVERED');
      const email = detail.body.deliveries.find((d: { channel: string }) => d.channel === 'EMAIL');
      expect(['SENT', 'SKIPPED']).toContain(email.status);
    });

    it('rejects a different user from reading it', async () => {
      await request(app.getHttpServer())
        .get(`/communications/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .expect(403);
    });

    it('marks the notification read', async () => {
      const res = await request(app.getHttpServer())
        .post(`/communications/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);
      expect(res.body.readAt).not.toBeNull();
    });

    it('marks all remaining notifications read', async () => {
      const res = await request(app.getHttpServer())
        .post('/communications/notifications/read-all')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);
      expect(typeof res.body.count).toBe('number');
    });

    it('archives the notification', async () => {
      const res = await request(app.getHttpServer())
        .post(`/communications/notifications/${notificationId}/archive`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);
      expect(res.body.archivedAt).not.toBeNull();
    });
  });

  describe('notification preference enforcement', () => {
    it('returns secure defaults (both channels enabled) for an untouched category', async () => {
      const res = await request(app.getHttpServer())
        .get('/communications/preferences')
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .expect(200);
      const announcement = res.body.find((p: { category: string }) => p.category === 'ANNOUNCEMENT');
      expect(announcement.inAppEnabled).toBe(true);
      expect(announcement.emailEnabled).toBe(true);
    });

    it('rejects disabling the in-app channel for SYSTEM notifications', async () => {
      await request(app.getHttpServer())
        .patch('/communications/preferences/SYSTEM')
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .send({ inAppEnabled: false })
        .expect(400);
    });

    it('lets the member opt out of ANNOUNCEMENT in-app notifications', async () => {
      await request(app.getHttpServer())
        .patch('/communications/preferences/ANNOUNCEMENT')
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .send({ inAppEnabled: false })
        .expect(200);
    });

    it('suppresses a new announcement notification for the opted-out user but still delivers it to others', async () => {
      const created = await request(app.getHttpServer())
        .post('/communications/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Second announcement', body: 'Body', scope: 'PLATFORM' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/communications/announcements/${created.body.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const optedOutList = await request(app.getHttpServer())
        .get('/communications/notifications?category=ANNOUNCEMENT')
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .expect(200);
      expect(optedOutList.body.data.some((n: { title: string }) => n.title === 'Second announcement')).toBe(false);

      const memberList = await request(app.getHttpServer())
        .get('/communications/notifications?category=ANNOUNCEMENT')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(memberList.body.data.some((n: { title: string }) => n.title === 'Second announcement')).toBe(true);
    });
  });

  describe('steward-scoped announcement authorization', () => {
    let relationshipId: string;

    it('creates an ACTIVE stewardship relationship for the steward-audience test', async () => {
      const res = await request(app.getHttpServer())
        .post('/stewardship/relationships/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ memberId, stewardId })
        .expect(201);
      expect(res.body.status).toBe('ACTIVE');
      relationshipId = res.body.id;
    });

    it('lets the steward announce to their own assigned members', async () => {
      const created = await request(app.getHttpServer())
        .post('/communications/announcements')
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ title: 'A note from your steward', body: 'Checking in!', scope: 'STEWARD_MEMBERS' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/communications/announcements/${created.body.id}/publish`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .expect(201);

      const memberList = await request(app.getHttpServer())
        .get('/communications/notifications?category=ANNOUNCEMENT')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(memberList.body.data.some((n: { title: string }) => n.title === 'A note from your steward')).toBe(true);

      const unrelatedList = await request(app.getHttpServer())
        .get('/communications/notifications?category=ANNOUNCEMENT')
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .expect(200);
      expect(unrelatedList.body.data.some((n: { title: string }) => n.title === 'A note from your steward')).toBe(false);
    });

    describe('stewardship messaging', () => {
      let conversationId: string;

      it('lets the member start the conversation for their ACTIVE relationship', async () => {
        const res = await request(app.getHttpServer())
          .post(`/communications/conversations/stewardship/${relationshipId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(201);
        expect(res.body.type).toBe('STEWARDSHIP');
        conversationId = res.body.id;
      });

      it('is idempotent — the steward starting it again returns the same conversation', async () => {
        const res = await request(app.getHttpServer())
          .post(`/communications/conversations/stewardship/${relationshipId}`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .expect(201);
        expect(res.body.id).toBe(conversationId);
      });

      it('lets the member send a message', async () => {
        const res = await request(app.getHttpServer())
          .post(`/communications/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ body: 'Hi, I have a question about my journey.' })
          .expect(201);
        expect(res.body.senderId).toBe(memberId);
      });

      it('lets the steward reply', async () => {
        const res = await request(app.getHttpServer())
          .post(`/communications/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .send({ body: 'Happy to help — what do you need?' })
          .expect(201);
        expect(res.body.senderId).toBe(stewardId);
      });

      it('lists the message history for both participants', async () => {
        const res = await request(app.getHttpServer())
          .get(`/communications/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);
        expect(res.body.total).toBe(2);
      });

      it('rejects an unrelated user from reading or sending messages (cross-member isolation)', async () => {
        await request(app.getHttpServer())
          .get(`/communications/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${otherMemberToken}`)
          .expect(403);
        await request(app.getHttpServer())
          .post(`/communications/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${otherMemberToken}`)
          .send({ body: 'intrusion' })
          .expect(403);
      });

      it('lets the member mark the conversation read', async () => {
        await request(app.getHttpServer())
          .post(`/communications/conversations/${conversationId}/read`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(201);
      });
    });
  });

  describe('organization-scoped announcements and messaging', () => {
    let organizationId: string;

    it('creates a verified organization with two representatives', async () => {
      const created = await request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${orgRepAToken}`)
        .send({
          name: `${orgNameMarker}Partners`, shortDescription: 'desc', fullDescription: 'A full description of the organization.',
          organizationType: 'NONPROFIT', websiteUrl: 'https://example.test',
        })
        .expect(201);
      organizationId = created.body.id;

      await request(app.getHttpServer())
        .post(`/organizations/${organizationId}/submit-for-review`)
        .set('Authorization', `Bearer ${orgRepAToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/organizations/${organizationId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/organizations/${organizationId}/members`)
        .set('Authorization', `Bearer ${orgRepAToken}`)
        .send({ userId: orgRepBId })
        .expect(201);
    });

    it('rejects a non-representative from creating an ORGANIZATION announcement', async () => {
      await request(app.getHttpServer())
        .post('/communications/announcements')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'x', body: 'y', scope: 'ORGANIZATION', organizationId })
        .expect(403);
    });

    it('lets the ADMIN representative create and publish an ORGANIZATION announcement', async () => {
      const created = await request(app.getHttpServer())
        .post('/communications/announcements')
        .set('Authorization', `Bearer ${orgRepAToken}`)
        .send({ title: 'New partnership benefits', body: 'Details inside.', scope: 'ORGANIZATION', organizationId })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/communications/announcements/${created.body.id}/publish`)
        .set('Authorization', `Bearer ${orgRepAToken}`)
        .expect(201);

      const repBList = await request(app.getHttpServer())
        .get('/communications/notifications?category=ANNOUNCEMENT')
        .set('Authorization', `Bearer ${orgRepBToken}`)
        .expect(200);
      expect(repBList.body.data.some((n: { title: string }) => n.title === 'New partnership benefits')).toBe(true);
    });

    it('lets two representatives of the same organization message each other', async () => {
      const started = await request(app.getHttpServer())
        .post(`/communications/conversations/organization/${organizationId}/with/${orgRepBId}`)
        .set('Authorization', `Bearer ${orgRepAToken}`)
        .expect(201);
      expect(started.body.type).toBe('ORGANIZATION');

      await request(app.getHttpServer())
        .post(`/communications/conversations/${started.body.id}/messages`)
        .set('Authorization', `Bearer ${orgRepAToken}`)
        .send({ body: 'Welcome to the team.' })
        .expect(201);
    });

    it('rejects a representative of a different organization from messaging in (cross-organization isolation)', async () => {
      await request(app.getHttpServer())
        .post(`/communications/conversations/organization/${organizationId}/with/${orgRepBId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });
});
