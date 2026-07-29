import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * End-to-end test: boots the full Nest application and exercises the
 * COORDINATED_PLAN orchestration goal (Member Arrival — Steward Experience
 * migration, item 4) against real, seeded fixtures — proving the plan
 * genuinely pairs one Primary next step with real Supporting step(s) drawn
 * from at least two distinct categories, and that each item still carries
 * its own real, unmodified approval mechanism (no auto-execution).
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('AI Orchestrator — COORDINATED_PLAN — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const markerTitlePrefix = `E2E-PLAN-${randomUUID()}-`;
  const emailMarker = `e2e-plan-${randomUUID()}`;

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  const adminId = randomUUID();
  const stewardId = randomUUID();
  let adminToken: string;
  let stewardToken: string;

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
    stewardToken = tokenFor(stewardId, [UserRole.STEWARD]);

    const learnerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `learner-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    learnerId = learnerRes.body.user.id;
    learnerToken = tokenFor(learnerId, [UserRole.MEMBER]);
  });

  afterAll(async () => {
    await prisma.db.aiOrchestrationRun.deleteMany({ where: { userId: learnerId } });
    await prisma.db.aiRecommendation.deleteMany({ where: { userId: learnerId } });
    await prisma.db.aiRequest.deleteMany({ where: { userId: learnerId } });
    await prisma.db.aiConversation.deleteMany({ where: { userId: learnerId } });
    await prisma.db.opportunity.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.db.resource.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.db.citySheetEntry.deleteMany({ where: { organizationName: { startsWith: markerTitlePrefix } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
  });

  it('rejects unauthenticated access to the orchestrator', async () => {
    await request(app.getHttpServer()).post('/ai/orchestrate').send({ goal: 'COORDINATED_PLAN' }).expect(401);
  });

  describe('a plan built from Recommendation categories alone (no stated need)', () => {
    let opportunityId: string;
    let resourceId: string;

    beforeAll(async () => {
      const opp = await request(app.getHttpServer())
        .post('/opportunities')
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({
          title: `${markerTitlePrefix}Scholarship`, shortDescription: 'A scholarship', fullDescription: 'A full scholarship description here.',
          category: 'SCHOLARSHIP', provider: 'Test Provider', officialSourceUrl: 'https://example.test/scholarship',
          eligibilityRules: 'Must be enrolled full-time.', benefitType: 'GRANT', sourceName: 'Test Source',
          submittedById: stewardId, createdById: stewardId,
        })
        .expect(201);
      opportunityId = opp.body.id;
      await request(app.getHttpServer())
        .post(`/opportunities/${opportunityId}/submit-for-review`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ submittedById: stewardId })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/opportunities/${opportunityId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reviewedById: adminId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/resources')
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({
          title: `${markerTitlePrefix}Food Bank`, shortDescription: 'A food bank', fullDescription: 'A full food bank description here.',
          category: 'NONPROFIT_ORGANIZATION', resourceType: 'ORGANIZATION', organizationName: 'Test Org',
          officialSourceUrl: 'https://example.test/foodbank', sourceName: 'Test Source',
        })
        .expect(201);
      resourceId = res.body.id;
      await request(app.getHttpServer())
        .post(`/resources/${resourceId}/submit-for-review`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/resources/${resourceId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
    });

    it('pairs a Primary next step with a real Supporting step from a different category, each carrying its own rationale', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai/orchestrate')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ goal: 'COORDINATED_PLAN' })
        .expect(201);

      expect(res.body.run.status).toBe('SUCCESS');
      expect(res.body.run.capabilitiesInvoked).toEqual(expect.arrayContaining(['RECOMMENDATION']));

      const { plan } = res.body;
      expect(plan.primary).toBeDefined();
      expect(plan.primary.source).toBe('RECOMMENDATION');
      expect(plan.primary.recommendation).toBeDefined();
      expect(plan.primary.recommendation.rationale.length).toBeGreaterThan(0);

      expect(plan.supporting.length).toBeGreaterThanOrEqual(1);
      const categories = new Set([plan.primary.categoryLabel, ...plan.supporting.map((s: { categoryLabel: string }) => s.categoryLabel)]);
      expect(categories.size).toBeGreaterThanOrEqual(2);

      expect(plan.combinedRationale.length).toBeGreaterThan(0);
      expect(typeof plan.additionalPossibilitiesCount).toBe('number');
    });

    it('never auto-decides a plan item — the primary recommendation still requires the existing explicit approve/dismiss call', async () => {
      const orchestrated = await request(app.getHttpServer())
        .post('/ai/orchestrate')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ goal: 'COORDINATED_PLAN' })
        .expect(201);
      const recommendationId = orchestrated.body.plan.primary.recommendation.id;

      const before = await request(app.getHttpServer())
        .get(`/ai/recommendations/${recommendationId}`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(before.body.status).toBe('PENDING');

      const approved = await request(app.getHttpServer())
        .post(`/ai/recommendations/${recommendationId}/approve`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      expect(approved.body.status).toBe('ACCEPTED');
    });

    it('records the run in the caller\'s orchestration history', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai/orchestration/runs/me?goal=COORDINATED_PLAN')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].goal).toBe('COORDINATED_PLAN');
    });
  });

  describe('a plan led by a real, verified City Sheet resource when a stated need is provided', () => {
    let needId: string;
    let verifiedEntryId: string;

    beforeAll(async () => {
      const entry = await request(app.getHttpServer())
        .post('/city-sheet')
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({
          organizationName: `${markerTitlePrefix}Verified Food Bank`, category: 'FOOD_RESOURCE',
          description: 'A verified, real food bank for the community.', serviceArea: 'Chester County',
          hours: 'Mon-Fri 9am-5pm',
        })
        .expect(201);
      verifiedEntryId = entry.body.id;
      await request(app.getHttpServer())
        .post(`/city-sheet/${verifiedEntryId}/verify`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ confidence: 'HIGH' })
        .expect(201);

      const conversation = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'Plan food need' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/ai/conversations/${conversation.body.id}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'I need help finding food for my family' })
        .expect(201);

      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      needId = needs.body.find((n: { conversationId: string }) => n.conversationId === conversation.body.id).id;
    });

    it('leads with the verified City Sheet match ahead of every Recommendation category', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai/orchestrate')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ goal: 'COORDINATED_PLAN', needId })
        .expect(201);

      const { plan } = res.body;
      expect(plan.primary.source).toBe('CITY_RESOURCE');
      expect(plan.primary.cityResource.id).toBe(verifiedEntryId);
      expect(plan.primary.cityResource.verificationStatus).toBe('VERIFIED');
      expect(plan.primary.cityResource.verifiedById).toBeUndefined();
      expect(plan.primary.categoryLabel).toBe('Verified local resource');

      // Supporting steps still come from a genuinely different category —
      // the City Sheet match leading never crowds out the rest of the plan.
      expect(plan.supporting.length).toBeGreaterThanOrEqual(1);
      expect(plan.supporting.every((s: { source: string }) => s.source === 'RECOMMENDATION')).toBe(true);
    });

    it('forbids building a plan around another member\'s stated need', async () => {
      const otherRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `other-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
        .expect(201);
      const otherToken = jwt.sign({ sub: otherRes.body.user.id, email: `other-${emailMarker}@example.test`, roles: [UserRole.MEMBER] });

      await request(app.getHttpServer())
        .post('/ai/orchestrate')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ goal: 'COORDINATED_PLAN', needId })
        .expect(403);

      await prisma.db.user.delete({ where: { id: otherRes.body.user.id } });
    });
  });
});
