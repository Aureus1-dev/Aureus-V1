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
 * End-to-end test: exercises the Goal → Journey → Milestone → Task ownership
 * chain introduced by WO-022 through the real HTTP layer.
 *
 * Goal.userId carries a real FK to User, so the owner/other-member personas
 * are registered via /auth/register rather than minted with a synthetic UUID
 * (which would 400 with a Prisma "Related record not found" error).
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('Goals / Journeys / Milestones / Tasks — Ownership E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  const emailMarker = `e2e-wo022-${randomUUID()}`;
  const titleMarker = `E2E-WO022-${randomUUID()}-`;

  const adminId = randomUUID();
  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  let ownerId: string;
  let ownerToken: string;
  let otherMemberId: string;
  let otherMemberToken: string;
  let adminToken: string;

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

    adminToken = tokenFor(adminId, [UserRole.PLATFORM_ADMINISTRATOR]);

    const ownerReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `owner-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    ownerId = ownerReg.body.user.id;
    ownerToken = ownerReg.body.tokens.accessToken;

    const otherReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `other-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    otherMemberId = otherReg.body.user.id;
    otherMemberToken = otherReg.body.tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.db.goal.deleteMany({ where: { title: { startsWith: titleMarker } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
  });

  it('rejects unauthenticated goal creation', async () => {
    await request(app.getHttpServer())
      .post('/goals')
      .send({ title: `${titleMarker}Unauthed` })
      .expect(401);
  });

  let goalId: string;

  it('creates a goal defaulting to the caller as owner', async () => {
    const res = await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: `${titleMarker}Learn TypeScript` })
      .expect(201);

    expect(res.body.userId).toBe(ownerId);
    goalId = res.body.id;
  });

  it('forbids a member from creating a goal for another user', async () => {
    await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .send({ title: `${titleMarker}Spoofed`, userId: ownerId })
      .expect(403);
  });

  it('forbids a non-owner from reading the goal', async () => {
    await request(app.getHttpServer())
      .get(`/goals/${goalId}`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .expect(403);
  });

  it('allows the owner to read their own goal', async () => {
    const res = await request(app.getHttpServer())
      .get(`/goals/${goalId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.id).toBe(goalId);
  });

  it('scopes GET /goals to the caller by default', async () => {
    const res = await request(app.getHttpServer())
      .get('/goals')
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .expect(200);
    expect(res.body.data.every((g: { userId: string }) => g.userId === otherMemberId)).toBe(true);
  });

  describe('journeys', () => {
    let journeyId: string;

    it('forbids a non-owner from creating a journey on the goal', async () => {
      await request(app.getHttpServer())
        .post('/journeys')
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .send({ title: `${titleMarker}Journey`, goalId })
        .expect(403);
    });

    it('allows the owner to create a journey', async () => {
      const res = await request(app.getHttpServer())
        .post('/journeys')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: `${titleMarker}Journey`, goalId })
        .expect(201);
      journeyId = res.body.id;
    });

    it('forbids a non-owner from reading the journey', async () => {
      await request(app.getHttpServer())
        .get(`/journeys/${journeyId}`)
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .expect(403);
    });

    it('allows an administrator to read the journey', async () => {
      await request(app.getHttpServer())
        .get(`/journeys/${journeyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    describe('milestones', () => {
      let milestoneId: string;

      it('forbids a non-owner from creating a milestone', async () => {
        await request(app.getHttpServer())
          .post('/milestones')
          .set('Authorization', `Bearer ${otherMemberToken}`)
          .send({ title: `${titleMarker}Milestone`, journeyId })
          .expect(403);
      });

      it('allows the owner to create a milestone', async () => {
        const res = await request(app.getHttpServer())
          .post('/milestones')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ title: `${titleMarker}Milestone`, journeyId })
          .expect(201);
        milestoneId = res.body.id;
      });

      it('forbids listing milestones as a non-admin without a journeyId', async () => {
        await request(app.getHttpServer())
          .get('/milestones')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(403);
      });

      it('lists milestones scoped to the owned journey', async () => {
        const res = await request(app.getHttpServer())
          .get('/milestones')
          .query({ journeyId })
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);
        expect(res.body.data.some((m: { id: string }) => m.id === milestoneId)).toBe(true);
      });

      it('forbids a non-owner from reading the milestone', async () => {
        await request(app.getHttpServer())
          .get(`/milestones/${milestoneId}`)
          .set('Authorization', `Bearer ${otherMemberToken}`)
          .expect(403);
      });

      describe('tasks', () => {
        let taskId: string;

        it('forbids a non-owner from creating a task', async () => {
          await request(app.getHttpServer())
            .post('/tasks')
            .set('Authorization', `Bearer ${otherMemberToken}`)
            .send({ title: `${titleMarker}Task`, milestoneId })
            .expect(403);
        });

        it('allows the owner to create a task', async () => {
          const res = await request(app.getHttpServer())
            .post('/tasks')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ title: `${titleMarker}Task`, milestoneId })
            .expect(201);
          taskId = res.body.id;
        });

        it('forbids a non-owner from reading, updating, or deleting the task', async () => {
          await request(app.getHttpServer())
            .get(`/tasks/${taskId}`)
            .set('Authorization', `Bearer ${otherMemberToken}`)
            .expect(403);
          await request(app.getHttpServer())
            .patch(`/tasks/${taskId}`)
            .set('Authorization', `Bearer ${otherMemberToken}`)
            .send({ title: 'Hijacked' })
            .expect(403);
          await request(app.getHttpServer())
            .delete(`/tasks/${taskId}`)
            .set('Authorization', `Bearer ${otherMemberToken}`)
            .expect(403);
        });

        it('allows the owner to update and delete the task', async () => {
          const res = await request(app.getHttpServer())
            .patch(`/tasks/${taskId}`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ title: `${titleMarker}Task Updated` })
            .expect(200);
          expect(res.body.title).toBe(`${titleMarker}Task Updated`);

          await request(app.getHttpServer())
            .delete(`/tasks/${taskId}`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .expect(204);
        });
      });
    });
  });

  it('allows an administrator to delete the goal regardless of ownership', async () => {
    await request(app.getHttpServer())
      .delete(`/goals/${goalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/goals/${goalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
