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
