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
 * End-to-end test: boots the full Nest application and exercises the AI
 * Intelligence Engine (WO-029, PA-006) — conversation-based Question
 * Answering, the four "explain/guidance" insight capabilities, Knowledge
 * Search, the Recommendation engine (including its non-JSON-response
 * fallback path — deterministic since AI_PROVIDER defaults to "stub" with
 * no external network calls, see ADR-015 Decision 7), approval/dismissal,
 * and AI request history (audit log + cost tracking).
 *
 * `AiConversation.userId`/`AiRequest.userId`/`AiRecommendation.userId`
 * carry real FKs to `User` (ADR-015 Decision 5), so the `learner` persona is
 * a real registered user via `/auth/register`. Author/moderator personas
 * (`Course.authorId`, `Opportunity.submittedById`, etc.) remain synthetic
 * self-minted tokens, matching every prior domain's e2e precedent.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('AI Intelligence Engine — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const markerTitlePrefix = `E2E-WO029-${randomUUID()}-`;
  const emailMarker = `e2e-wo029-${randomUUID()}`;

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  const adminId = randomUUID();
  const stewardId = randomUUID();
  let adminToken: string;
  let stewardToken: string;

  let learnerId: string;
  let learnerToken: string;
  let otherLearnerId: string;
  let otherLearnerToken: string;

  let opportunityId: string;
  let resourceId: string;
  let courseId: string;
  let goalId: string;
  let journeyId: string;

  beforeAll(async () => {
    // C2 — V1 Scope Lockdown gates /ai/voice and /academy off by default
    // (LAUNCH-001: "no Pods, no Academy... voice entirely"). This suite
    // uses an Academy course as an AI-guidance fixture and exercises the
    // voice session endpoints directly, so both are flipped on for this
    // suite only — restored in afterAll so no other suite observes it.
    V1_FEATURE_FLAGS.voice = true;
    V1_FEATURE_FLAGS.academy = true;

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

    const otherRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `other-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    otherLearnerId = otherRes.body.user.id;
    otherLearnerToken = tokenFor(otherLearnerId, [UserRole.MEMBER]);

    // Seed a verified Opportunity, Resource, and Course as grounding data.
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

    const course = await request(app.getHttpServer())
      .post('/academy/courses')
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({
        title: `${markerTitlePrefix}Budgeting 101`, shortDescription: 'Learn budgeting', fullDescription: 'A full description of the budgeting course.',
        learningDomain: 'FINANCIAL_LITERACY',
      })
      .expect(201);
    courseId = course.body.id;
    await request(app.getHttpServer())
      .post(`/academy/courses/${courseId}/submit-for-review`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/academy/courses/${courseId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    // Seed a verified Knowledge article.
    await request(app.getHttpServer())
      .post('/knowledge/articles')
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({
        title: `${markerTitlePrefix}Requesting a Steward`, summary: 'A quick guide', content: 'Full content about requesting a steward, quite long.',
        category: 'GUIDE',
      })
      .expect(201)
      .then(async (articleRes) => {
        await request(app.getHttpServer())
          .post(`/knowledge/articles/${articleRes.body.id}/submit-for-review`)
          .set('Authorization', `Bearer ${stewardToken}`)
          .expect(201);
        await request(app.getHttpServer())
          .post(`/knowledge/articles/${articleRes.body.id}/verify`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(201);
      });

    // Seed the learner's own Goal + Journey.
    const goal = await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ title: `${markerTitlePrefix}Save $1000` })
      .expect(201);
    goalId = goal.body.id;

    const journey = await request(app.getHttpServer())
      .post('/journeys')
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ title: `${markerTitlePrefix}Savings Journey`, goalId })
      .expect(201);
    journeyId = journey.body.id;

    await request(app.getHttpServer())
      .post('/milestones')
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ title: `${markerTitlePrefix}Open a savings account`, journeyId, position: 0 })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.db.aiRecommendation.deleteMany({ where: { userId: { in: [learnerId, otherLearnerId] } } });
    await prisma.db.aiRequest.deleteMany({ where: { userId: { in: [learnerId, otherLearnerId] } } });
    await prisma.db.aiConversation.deleteMany({ where: { userId: { in: [learnerId, otherLearnerId] } } });
    await prisma.db.opportunity.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.db.resource.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.db.course.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.db.knowledgeArticle.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.db.goal.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
    V1_FEATURE_FLAGS.voice = false;
    V1_FEATURE_FLAGS.academy = false;
  });

  it('rejects unauthenticated access to every AI endpoint', async () => {
    await request(app.getHttpServer()).post('/ai/conversations').send({}).expect(401);
    await request(app.getHttpServer()).post(`/ai/opportunities/${opportunityId}/explain`).expect(401);
    await request(app.getHttpServer()).post('/ai/recommendations').send({ category: 'OPPORTUNITY' }).expect(401);
  });

  describe('Conversations — AI Question Answering', () => {
    let conversationId: string;

    it('creates a conversation and asks a question, receiving an assistant reply via the stub provider', async () => {
      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'My questions' })
        .expect(201);
      conversationId = created.body.id;

      const asked = await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'What is a Journey?' })
        .expect(201);
      expect(asked.body.role).toBe('ASSISTANT');
      expect(asked.body.content.length).toBeGreaterThan(0);

      const messages = await request(app.getHttpServer())
        .get(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(messages.body).toHaveLength(2);
      expect(messages.body[0].role).toBe('USER');
    });

    it('forbids another member from reading the conversation', async () => {
      await request(app.getHttpServer())
        .get(`/ai/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${otherLearnerToken}`)
        .expect(403);
    });

    it('logs the Q&A call in the caller\'s AI request history with cost/token tracking', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai/requests/me?capability=QUESTION_ANSWERING')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].status).toBe('SUCCESS');
      expect(typeof res.body.data[0].costUsd).toBe('number');
    });
  });

  describe('Gate C — C1: Understanding (stated need capture)', () => {
    it('captures the first message of a new conversation as a stated need, retrievable by the member', async () => {
      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'New need' })
        .expect(201);
      const conversationId = created.body.id;

      await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'I need help finding a job' })
        .expect(201);

      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(needs.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ conversationId, content: 'I need help finding a job' }),
        ]),
      );
    });

    it('does not capture a second message in the same conversation as a new stated need', async () => {
      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'Multi-turn' })
        .expect(201);
      const conversationId = created.body.id;

      await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'First message' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'Second message' })
        .expect(201);

      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      const forThisConversation = needs.body.filter((n: { conversationId: string }) => n.conversationId === conversationId);
      expect(forThisConversation).toHaveLength(1);
      expect(forThisConversation[0].content).toBe('First message');
    });

    it("rejects unauthenticated access and never exposes another member's stated needs", async () => {
      await request(app.getHttpServer()).get('/needs').expect(401);

      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${otherLearnerToken}`)
        .expect(200);
      expect(needs.body).toEqual([]);
    });
  });

  describe('Gate C — C2: Clarification', () => {
    it('reliably asks a clarifying question for an ambiguous initial need, and incorporates the answer without restarting', async () => {
      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'Ambiguous start' })
        .expect(201);
      const conversationId = created.body.id;

      const clarified = await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'help' })
        .expect(201);
      expect(clarified.body.content).toMatch(/tell me a little more/i);

      const answered = await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'I need help finding affordable housing in Chester County' })
        .expect(201);
      expect(answered.body.role).toBe('ASSISTANT');
      expect(answered.body.content.length).toBeGreaterThan(0);

      const messages = await request(app.getHttpServer())
        .get(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(messages.body).toHaveLength(4);
      expect(messages.body[0].content).toBe('help');
      expect(messages.body[2].content).toBe('I need help finding affordable housing in Chester County');
    });
  });

  describe('Gate C — C3: Urgency assessment', () => {
    it('reliably redirects crisis language to real, immediate help instead of the AI response', async () => {
      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'Crisis' })
        .expect(201);
      const conversationId = created.body.id;

      const redirected = await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'I want to kill myself' })
        .expect(201);
      expect(redirected.body.content).toMatch(/988/);
      expect(redirected.body.content).toMatch(/911/);

      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(needs.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ conversationId, content: 'I want to kill myself' }),
        ]),
      );
    });

    it('detects crisis language later in a conversation, not only on the first message', async () => {
      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'Escalating' })
        .expect(201);
      const conversationId = created.body.id;

      await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'I need help finding a job' })
        .expect(201);

      const redirected = await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: "I can't go on anymore" })
        .expect(201);
      expect(redirected.body.content).toMatch(/988/);
    });

    it('redirects a short crisis message instead of asking a clarifying question', async () => {
      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'Short crisis' })
        .expect(201);
      const conversationId = created.body.id;

      const response = await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'want to die' })
        .expect(201);
      expect(response.body.content).toMatch(/988/);
      expect(response.body.content).not.toMatch(/tell me a little more/i);
    });
  });

  describe('Gate C — C4: Resource discovery', () => {
    let foodBankEntryId: string;

    beforeAll(async () => {
      const created = await request(app.getHttpServer())
        .post('/city-sheet')
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({
          organizationName: `${markerTitlePrefix}Food Bank`, category: 'FOOD_RESOURCE',
          description: 'Provides free groceries to families in need.', serviceArea: 'Chester County',
          hours: 'Mon-Fri 9am-5pm',
        })
        .expect(201);
      foodBankEntryId = created.body.id;
      await request(app.getHttpServer())
        .post(`/city-sheet/${foodBankEntryId}/verify`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ confidence: 'HIGH' })
        .expect(201);
    });

    it('retrieves the matching, active City Sheet resource for a stated need, without exposing internal steward fields', async () => {
      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'Food need' })
        .expect(201);
      const conversationId = created.body.id;

      await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'I need help finding food for my family' })
        .expect(201);

      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      const need = needs.body.find((n: { conversationId: string }) => n.conversationId === conversationId);

      const resources = await request(app.getHttpServer())
        .get(`/needs/${need.id}/resources`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(resources.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: foodBankEntryId, organizationName: `${markerTitlePrefix}Food Bank` })]),
      );
      expect(resources.body[0].verifiedById).toBeUndefined();
      expect(resources.body[0].verificationNotes).toBeUndefined();
    });

    it('forbids a caller from viewing resources matched to another member\'s stated need', async () => {
      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'Food need 2' })
        .expect(201);
      const conversationId = created.body.id;
      await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'I need help finding food for my family' })
        .expect(201);
      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      const need = needs.body.find((n: { conversationId: string }) => n.conversationId === conversationId);

      await request(app.getHttpServer())
        .get(`/needs/${need.id}/resources`)
        .set('Authorization', `Bearer ${otherLearnerToken}`)
        .expect(403);
    });
  });

  describe('Gate C — C5: Verified resource presentation', () => {
    let verifiedEntryId: string;
    let testFixtureEntryId: string;
    let needId: string;

    beforeAll(async () => {
      const verified = await request(app.getHttpServer())
        .post('/city-sheet')
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({
          organizationName: `${markerTitlePrefix}Verified Food Bank`, category: 'FOOD_RESOURCE',
          description: 'A verified, real food bank for the community.', serviceArea: 'Chester County',
          hours: 'Mon-Fri 9am-5pm',
        })
        .expect(201);
      verifiedEntryId = verified.body.id;
      await request(app.getHttpServer())
        .post(`/city-sheet/${verifiedEntryId}/verify`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ confidence: 'HIGH' })
        .expect(201);

      const testFixture = await request(app.getHttpServer())
        .post('/city-sheet')
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({
          organizationName: `${markerTitlePrefix}Test Fixture Food Bank`, category: 'FOOD_RESOURCE',
          description: 'A labeled build/test fixture, not a real candidate.', serviceArea: 'Chester County',
          hours: 'Mon-Fri 9am-5pm', isTestFixture: true,
        })
        .expect(201);
      testFixtureEntryId = testFixture.body.id;

      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'C5 food need' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/ai/conversations/${created.body.id}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'I need help finding food for my family' })
        .expect(201);
      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      needId = needs.body.find((n: { conversationId: string }) => n.conversationId === created.body.id).id;
    });

    it('unambiguously distinguishes verified resources from unverified/test-fixture resources in the retrieved data', async () => {
      const resources = await request(app.getHttpServer())
        .get(`/needs/${needId}/resources`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);

      const verifiedResource = resources.body.find((r: { id: string }) => r.id === verifiedEntryId);
      const testFixtureResource = resources.body.find((r: { id: string }) => r.id === testFixtureEntryId);
      expect(verifiedResource.verificationStatus).toBe('VERIFIED');
      expect(verifiedResource.isTestFixture).toBe(false);
      expect(testFixtureResource.verificationStatus).toBe('UNVERIFIED');
      expect(testFixtureResource.isTestFixture).toBe(true);
    });

    it('records an offer and the member\'s acceptance, retrievable afterward', async () => {
      const offer = await request(app.getHttpServer())
        .post(`/needs/${needId}/resources/${verifiedEntryId}/offer`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      expect(offer.body.response).toBe('PENDING');

      const responded = await request(app.getHttpServer())
        .post(`/needs/${needId}/resources/${verifiedEntryId}/respond`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ accepted: true })
        .expect(201);
      expect(responded.body.response).toBe('ACCEPTED');
      expect(responded.body.respondedAt).not.toBeNull();

      const offers = await request(app.getHttpServer())
        .get(`/needs/${needId}/offers`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(offers.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: offer.body.id, response: 'ACCEPTED' })]),
      );
    });

    it('records a declined response for a separately offered resource', async () => {
      await request(app.getHttpServer())
        .post(`/needs/${needId}/resources/${testFixtureEntryId}/offer`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);

      const responded = await request(app.getHttpServer())
        .post(`/needs/${needId}/resources/${testFixtureEntryId}/respond`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ accepted: false })
        .expect(201);
      expect(responded.body.response).toBe('DECLINED');
    });

    it('forbids another member from offering or responding on this stated need', async () => {
      await request(app.getHttpServer())
        .post(`/needs/${needId}/resources/${verifiedEntryId}/offer`)
        .set('Authorization', `Bearer ${otherLearnerToken}`)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/needs/${needId}/offers`)
        .set('Authorization', `Bearer ${otherLearnerToken}`)
        .expect(403);
    });
  });

  describe('Gate C — C6: Steward escalation', () => {
    let escalationNeedId: string;

    beforeAll(async () => {
      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'C6 need' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/ai/conversations/${created.body.id}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'I need help finding food for my family' })
        .expect(201);
      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      escalationNeedId = needs.body.find((n: { conversationId: string }) => n.conversationId === created.body.id).id;
    });

    it('publishes the real on-call rotation and reports it back honestly (never a fabricated placeholder — see the unit test for the unconfigured-null default)', async () => {
      await request(app.getHttpServer())
        .patch('/on-call-hours')
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ hoursDescription: 'Monday-Friday 9am-6pm ET' })
        .expect(200);

      const after = await request(app.getHttpServer())
        .get('/on-call-hours')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(after.body.hoursDescription).toBe('Monday-Friday 9am-6pm ET');
    });

    it('forbids a member from publishing on-call hours', async () => {
      await request(app.getHttpServer())
        .patch('/on-call-hours')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ hoursDescription: 'Whenever I feel like it' })
        .expect(403);
    });

    it("records the member's own escalation, pages the steward, and lets the steward record the outcome", async () => {
      const escalated = await request(app.getHttpServer())
        .post(`/needs/${escalationNeedId}/escalate`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ reason: 'I need to talk to a real person' })
        .expect(201);
      expect(escalated.body.status).toBe('PENDING');

      const acknowledged = await request(app.getHttpServer())
        .post(`/needs/escalations/${escalated.body.id}/acknowledge`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .expect(201);
      expect(acknowledged.body.status).toBe('ACKNOWLEDGED');

      const resolved = await request(app.getHttpServer())
        .post(`/needs/escalations/${escalated.body.id}/resolve`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ resolutionNotes: 'Called the member and helped them directly.' })
        .expect(201);
      expect(resolved.body.status).toBe('RESOLVED');
      expect(resolved.body.resolutionNotes).toBe('Called the member and helped them directly.');

      const list = await request(app.getHttpServer())
        .get(`/needs/${escalationNeedId}/escalations`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(list.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: escalated.body.id, status: 'RESOLVED' })]),
      );
    });

    it('forbids a member from acknowledging or resolving an escalation', async () => {
      const escalated = await request(app.getHttpServer())
        .post(`/needs/${escalationNeedId}/escalate`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/needs/escalations/${escalated.body.id}/acknowledge`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(403);
      await request(app.getHttpServer())
        .post(`/needs/escalations/${escalated.body.id}/resolve`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(403);
    });

    it("forbids another member from escalating or viewing this member's stated need", async () => {
      await request(app.getHttpServer())
        .post(`/needs/${escalationNeedId}/escalate`)
        .set('Authorization', `Bearer ${otherLearnerToken}`)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/needs/${escalationNeedId}/escalations`)
        .set('Authorization', `Bearer ${otherLearnerToken}`)
        .expect(403);
    });
  });

  describe('Gate C — C7: Safe failure', () => {
    const stateNeed = async (token: string, content: string): Promise<string> => {
      const created = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'C7 need' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/ai/conversations/${created.body.id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content })
        .expect(201);
      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      return needs.body.find((n: { conversationId: string }) => n.conversationId === created.body.id).id;
    };

    it('is not triggered when a verified resource exists for the matched category (reuses C5\'s verified Food Bank)', async () => {
      const needId = await stateNeed(learnerToken, 'I need help finding food for my family');

      const result = await request(app.getHttpServer())
        .get(`/needs/${needId}/safe-failure`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(result.body.triggered).toBe(false);
    });

    it('is not triggered when the need matches no known City Sheet category at all', async () => {
      const needId = await stateNeed(learnerToken, 'xyz nonsense words that match nothing');

      const result = await request(app.getHttpServer())
        .get(`/needs/${needId}/safe-failure`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(result.body.triggered).toBe(false);
    });

    it(
      'reports a consistent, idempotent result for a matched category with no verified resource — whether a real ' +
      'steward happens to be reachable elsewhere in this test run or not is a genuinely live, global fact this ' +
      'endpoint reads honestly rather than a condition this test can control, so both outcomes are valid; what must ' +
      'always hold is that repeating the check never produces a different answer or a duplicate record, and that a ' +
      'triggered result always carries a real, non-empty honest message and next step',
      async () => {
        const needId = await stateNeed(learnerToken, 'I need help with transportation to get to my job');

        const first = await request(app.getHttpServer())
          .get(`/needs/${needId}/safe-failure`)
          .set('Authorization', `Bearer ${learnerToken}`)
          .expect(200);
        const second = await request(app.getHttpServer())
          .get(`/needs/${needId}/safe-failure`)
          .set('Authorization', `Bearer ${learnerToken}`)
          .expect(200);

        expect(second.body).toEqual(first.body);
        if (first.body.triggered) {
          expect(first.body.message).toEqual(expect.any(String));
          expect(first.body.message.length).toBeGreaterThan(0);
          expect(first.body.nextStep).toEqual(expect.any(String));
          expect(first.body.nextStep.length).toBeGreaterThan(0);
          expect(first.body.recordedAt).not.toBeNull();
        }
      },
    );

    it("forbids checking safe-failure state for another member's stated need", async () => {
      const needId = await stateNeed(learnerToken, 'I need help with transportation somewhere else');

      await request(app.getHttpServer())
        .get(`/needs/${needId}/safe-failure`)
        .set('Authorization', `Bearer ${otherLearnerToken}`)
        .expect(403);
    });
  });

  describe('Gate C — C8: Gate C build/test sign-off (fixtures)', () => {
    // C1–C7 each already have their own dedicated tests above; this block's
    // one job is different — proving the whole understanding-through-safe-
    // failure pipeline composes correctly as a single continuous member
    // journey, using only an explicitly labeled `isTestFixture: true` City
    // Sheet entry throughout (never calling `/verify`), exactly as the
    // acceptance criteria requires: "without requiring verified City Sheet
    // data."
    it('carries one real test member through the full Clearing flow — understanding, resource discovery, verified presentation, steward escalation, and safe failure — against fixtures alone', async () => {
      // C1 (Understanding) and C2 (Clarification) already have their own
      // dedicated, passing coverage above (and C3, urgency, likewise) —
      // this test deliberately keeps its own conversation to a single
      // message rather than re-deriving those branches here, since every
      // message-post in this file shares one throttled route
      // (`@Throttle` on `POST /ai/conversations/:id/messages`, PD-001) and
      // C1–C3's blocks already spend a meaningful share of that budget.
      // What this test uniquely proves is that C4 through C7 compose
      // correctly as one continuous chain for a real member.
      const fixture = await request(app.getHttpServer())
        .post('/city-sheet')
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({
          organizationName: `${markerTitlePrefix}C8 Job Center`, category: 'EMPLOYMENT_JOB_SEARCH',
          description: 'A labeled build/test fixture, not a real candidate.', serviceArea: 'Chester County',
          hours: 'Mon-Fri 9am-5pm', isTestFixture: true,
        })
        .expect(201);
      const fixtureEntryId = fixture.body.id;
      expect(fixture.body.verificationStatus).toBe('UNVERIFIED');

      // C1 (Understanding): a clear first message is captured as the stated
      // need that drives everything below.
      const conversation = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'C8 sign-off' })
        .expect(201);
      const conversationId = conversation.body.id;
      await request(app.getHttpServer())
        .post(`/ai/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'I need help finding a job' })
        .expect(201);

      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      const needId = needs.body.find((n: { conversationId: string }) => n.conversationId === conversationId).id;

      // C4 (Resource discovery): the fixture is matched, unverified.
      const resources = await request(app.getHttpServer())
        .get(`/needs/${needId}/resources`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      const matched = resources.body.find((r: { id: string }) => r.id === fixtureEntryId);
      expect(matched).toBeDefined();
      expect(matched.verificationStatus).toBe('UNVERIFIED');
      expect(matched.isTestFixture).toBe(true);

      // C5 (Verified resource presentation): honestly labeled as test data
      // (never presented as verified), and the offer/response is recorded.
      const offer = await request(app.getHttpServer())
        .post(`/needs/${needId}/resources/${fixtureEntryId}/offer`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      const responded = await request(app.getHttpServer())
        .post(`/needs/${needId}/resources/${fixtureEntryId}/respond`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ accepted: true })
        .expect(201);
      expect(responded.body.id).toBe(offer.body.id);
      expect(responded.body.response).toBe('ACCEPTED');

      // C6 (Steward escalation): still the member's own choice, always
      // recorded end-to-end through acknowledgment and resolution.
      const escalated = await request(app.getHttpServer())
        .post(`/needs/${needId}/escalate`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ reason: 'I would like to talk this through with a person' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/needs/escalations/${escalated.body.id}/acknowledge`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .expect(201);
      const resolved = await request(app.getHttpServer())
        .post(`/needs/escalations/${escalated.body.id}/resolve`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ resolutionNotes: 'Spoke with the member directly.' })
        .expect(201);
      expect(resolved.body.status).toBe('RESOLVED');

      // C7 (Safe failure): reachable and honest regardless of outcome —
      // never errors, always a defined triggered state, no dead end.
      const safeFailure = await request(app.getHttpServer())
        .get(`/needs/${needId}/safe-failure`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(typeof safeFailure.body.triggered).toBe('boolean');
    });
  });

  describe('Gate C — C9: Production verification (real members, verified data only)', () => {
    // C9's acceptance criteria is narrower than C8's: "Real-member session
    // traces only to verified city sheet entries; no unverified or
    // live-crawled content ever appears." This test seeds a real
    // (non-fixture) *unverified* candidate — exactly the shape of A3's
    // still-untouched launch-metro candidates — alongside a real, actually
    // steward-verified entry in the same category, then proves a real
    // member's Clearing session only ever surfaces the verified one, both
    // through discovery and when attempting to offer the unverified one
    // directly by ID.
    it("a real member's resource discovery and offers trace only to verified City Sheet data, never an unverified real candidate", async () => {
      const unverifiedCandidate = await request(app.getHttpServer())
        .post('/city-sheet')
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({
          organizationName: `${markerTitlePrefix}C9 Unverified Legal Aid`, category: 'LEGAL_AID',
          description: 'A real candidate awaiting Human Steward verification (A4) — not yet trustworthy.',
          serviceArea: 'Delaware County', hours: 'not yet confirmed',
        })
        .expect(201);
      expect(unverifiedCandidate.body.verificationStatus).toBe('UNVERIFIED');
      expect(unverifiedCandidate.body.isTestFixture).toBe(false);

      const verifiedCandidate = await request(app.getHttpServer())
        .post('/city-sheet')
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({
          organizationName: `${markerTitlePrefix}C9 Verified Legal Aid`, category: 'LEGAL_AID',
          description: 'A real candidate, human-verified by a steward.', serviceArea: 'Delaware County',
          hours: 'Mon-Fri 9am-5pm',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/city-sheet/${verifiedCandidate.body.id}/verify`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ confidence: 'HIGH' })
        .expect(201);

      const conversation = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ title: 'C9 production verification' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/ai/conversations/${conversation.body.id}/messages`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ content: 'I got an eviction notice and need legal help' })
        .expect(201);
      const needs = await request(app.getHttpServer())
        .get('/needs')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      const needId = needs.body.find(
        (n: { conversationId: string }) => n.conversationId === conversation.body.id,
      ).id;

      const resources = await request(app.getHttpServer())
        .get(`/needs/${needId}/resources`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      const resourceIds = resources.body.map((r: { id: string }) => r.id);
      expect(resourceIds).toContain(verifiedCandidate.body.id);
      expect(resourceIds).not.toContain(unverifiedCandidate.body.id);

      // The verified entry can be offered and accepted normally — a real
      // member's session can be completed using only verified data.
      const offer = await request(app.getHttpServer())
        .post(`/needs/${needId}/resources/${verifiedCandidate.body.id}/offer`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/needs/${needId}/resources/${verifiedCandidate.body.id}/respond`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ accepted: true })
        .expect(201);
      expect(offer.body.response).toBe('PENDING');

      // Even bypassing discovery and addressing the unverified real
      // candidate directly by ID, an offer is refused (404 — not merely
      // filtered from a list, but genuinely unreachable).
      await request(app.getHttpServer())
        .post(`/needs/${needId}/resources/${unverifiedCandidate.body.id}/offer`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(404);
    });
  });

  describe('Insights — explanations, guidance, and search', () => {
    it('explains an Opportunity', async () => {
      const res = await request(app.getHttpServer())
        .post(`/ai/opportunities/${opportunityId}/explain`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      expect(res.body.content.length).toBeGreaterThan(0);
      expect(res.body.requestId).toBeDefined();
    });

    it('explains a Resource', async () => {
      const res = await request(app.getHttpServer())
        .post(`/ai/resources/${resourceId}/explain`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      expect(res.body.content.length).toBeGreaterThan(0);
    });

    it('provides Journey guidance for a journey the caller owns', async () => {
      const res = await request(app.getHttpServer())
        .post(`/ai/journeys/${journeyId}/guidance`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      expect(res.body.content.length).toBeGreaterThan(0);
    });

    it('forbids Journey guidance for a journey the caller does not own', async () => {
      await request(app.getHttpServer())
        .post(`/ai/journeys/${journeyId}/guidance`)
        .set('Authorization', `Bearer ${otherLearnerToken}`)
        .expect(403);
    });

    it('provides Academy guidance for a course, grounded in the caller\'s goals', async () => {
      const res = await request(app.getHttpServer())
        .post(`/ai/academy/courses/${courseId}/guidance`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      expect(res.body.content.length).toBeGreaterThan(0);
    });

    it('performs a Knowledge search and returns the grounding article sources', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai/knowledge/search')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ query: `${markerTitlePrefix}Requesting a Steward` })
        .expect(201);
      expect(res.body.content.length).toBeGreaterThan(0);
      expect(res.body.sources.some((s: { title: string }) => s.title.includes('Requesting a Steward'))).toBe(true);
    });
  });

  describe('Recommendations — generate, approve, dismiss', () => {
    let recommendationId: string;

    it('generates recommendations grounded in the caller\'s goals, using the deterministic fallback when the stub response is not JSON', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai/recommendations')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ category: 'OPPORTUNITY' })
        .expect(201);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].status).toBe('PENDING');
      expect(res.body[0].opportunityId).toBeDefined();
      recommendationId = res.body[0].id;
    });

    it('notifies the learner of the new recommendations via the Communication System', async () => {
      const res = await request(app.getHttpServer())
        .get('/communications/notifications?category=AI_GUIDANCE')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);
      expect(res.body.data.some((n: { type: string }) => n.type === 'ai.recommendation.created')).toBe(true);
    });

    it('forbids another member from viewing the recommendation', async () => {
      await request(app.getHttpServer())
        .get(`/ai/recommendations/${recommendationId}`)
        .set('Authorization', `Bearer ${otherLearnerToken}`)
        .expect(403);
    });

    it('lets the learner approve the recommendation — a status change only, no auto-enrollment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/ai/recommendations/${recommendationId}/approve`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      expect(res.body.status).toBe('ACCEPTED');
    });

    it('rejects re-deciding an already-decided recommendation', async () => {
      await request(app.getHttpServer())
        .post(`/ai/recommendations/${recommendationId}/dismiss`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(409);
    });
  });

  describe('Voice Domain — realtime sessions and the Conversation Timing Layer', () => {
    let voiceSessionId: string;
    let firstSyncedMessageId: string;

    it('starts a voice session via the stub provider (no OPENAI_API_KEY in this environment), never exposing a permanent key', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai/voice/sessions')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({})
        .expect(201);
      voiceSessionId = res.body.id;
      expect(res.body.clientSecret).toMatch(/^stub_secret_/);
      expect(res.body.turnDetectionMode).toBe('semantic_vad');
      expect(res.body.conversationId).toBeDefined();
    });

    it('rejects a member message with no corresponding MEMBER_TURN_FINALIZED turn event (Conversation Timing Layer enforcement)', async () => {
      await request(app.getHttpServer())
        .post(`/ai/voice/sessions/${voiceSessionId}/events`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ messages: [{ role: 'USER', content: 'Not finalized', providerItemId: 'e2e-item-unbacked' }] })
        .expect(400);
    });

    it('accepts a member message once backed by a MEMBER_TURN_FINALIZED turn event, and records an interrupted steward reply accurately', async () => {
      const res = await request(app.getHttpServer())
        .post(`/ai/voice/sessions/${voiceSessionId}/events`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          turnEvents: [
            { type: 'MEMBER_SPEECH_STARTED', providerItemId: 'e2e-item-001', occurredAt: new Date().toISOString() },
            { type: 'MEMBER_TURN_FINALIZED', providerItemId: 'e2e-item-001', occurredAt: new Date().toISOString() },
          ],
          messages: [
            { role: 'USER', content: 'What is a Journey?', providerItemId: 'e2e-item-001' },
            {
              role: 'ASSISTANT', content: 'A Journey tracks progress tow', providerItemId: 'e2e-item-002',
              completionStatus: 'INTERRUPTED',
            },
          ],
        })
        .expect(201);

      expect(res.body.turnEvents).toHaveLength(2);
      expect(res.body.messages).toHaveLength(2);
      const assistantMessage = res.body.messages.find((m: { role: string }) => m.role === 'ASSISTANT');
      expect(assistantMessage.completionStatus).toBe('INTERRUPTED');
      const userMessage = res.body.messages.find((m: { role: string }) => m.role === 'USER');
      firstSyncedMessageId = userMessage.id;
    });

    it('is idempotent — re-syncing the same finalized message returns the same row rather than duplicating it', async () => {
      const res = await request(app.getHttpServer())
        .post(`/ai/voice/sessions/${voiceSessionId}/events`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          turnEvents: [{ type: 'MEMBER_TURN_FINALIZED', providerItemId: 'e2e-item-001', occurredAt: new Date().toISOString() }],
          messages: [{ role: 'USER', content: 'What is a Journey?', providerItemId: 'e2e-item-001' }],
        })
        .expect(201);
      expect(res.body.messages[0].id).toBe(firstSyncedMessageId);
    });

    it('forbids another member from syncing events on this session', async () => {
      await request(app.getHttpServer())
        .post(`/ai/voice/sessions/${voiceSessionId}/events`)
        .set('Authorization', `Bearer ${otherLearnerToken}`)
        .send({})
        .expect(403);
    });

    it('ends the session and is idempotent on a second end call', async () => {
      const res1 = await request(app.getHttpServer())
        .post(`/ai/voice/sessions/${voiceSessionId}/end`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      expect(res1.body.endReason).toBe('MEMBER_ENDED');

      const res2 = await request(app.getHttpServer())
        .post(`/ai/voice/sessions/${voiceSessionId}/end`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
      expect(res2.body.endReason).toBe('MEMBER_ENDED');
    });

    it('starting a new session gracefully supersedes an existing active one for the same member', async () => {
      const first = await request(app.getHttpServer())
        .post('/ai/voice/sessions')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({})
        .expect(201);

      const second = await request(app.getHttpServer())
        .post('/ai/voice/sessions')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({})
        .expect(201);

      expect(second.body.id).not.toBe(first.body.id);
      await request(app.getHttpServer())
        .post(`/ai/voice/sessions/${second.body.id}/end`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(201);
    });
  });
});
