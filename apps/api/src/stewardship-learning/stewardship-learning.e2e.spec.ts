import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AiMessageRole, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

describe('PEOPLE-LEARN-001 — Stewardship Learning Loop E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  let memberId: string;
  let adminId: string;
  let memberToken: string;
  let adminToken: string;
  let conversationId: string;
  let statedNeedId: string;
  let responsibilityId: string;
  let memberMessageId: string;
  let unrelatedMessageId: string;
  let outcomeReportId: string;
  let unresolvedNeedId: string;

  const marker = `people-learn-${randomUUID()}`;
  const privateFeedback = `I already told you about my calendar ${marker}`;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    const memberEmail = `member-${marker}@example.test`;
    const adminEmail = `admin-${marker}@example.test`;
    const member = await prisma.db.user.create({ data: { email: memberEmail } });
    const admin = await prisma.db.user.create({ data: { email: adminEmail } });
    memberId = member.id;
    adminId = admin.id;

    memberToken = jwt.sign({
      sub: memberId,
      email: memberEmail,
      roles: [UserRole.MEMBER],
    });
    adminToken = jwt.sign({
      sub: adminId,
      email: adminEmail,
      roles: [UserRole.SYSTEM_ADMINISTRATOR],
    });

    const conversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Stewardship learning E2E' })
      .expect(201);
    conversationId = conversation.body.id;

    const need = await prisma.db.statedNeed.create({
      data: {
        userId: memberId,
        conversationId,
        content: `I need help organizing an important appointment ${marker}`,
      },
    });
    statedNeedId = need.id;

    const accepted = await request(app.getHttpServer())
      .post('/people/resolutions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ statedNeedId, objective: 'Help me carry this through to resolution' })
      .expect(201);
    responsibilityId = accepted.body.responsibility.id;

    const message = await prisma.db.aiMessage.create({
      data: {
        conversationId,
        role: AiMessageRole.USER,
        content: privateFeedback,
      },
    });
    memberMessageId = message.id;

    await request(app.getHttpServer())
      .post(`/people/resolutions/${responsibilityId}/outcome`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ resolved: false, note: `Still unresolved ${marker}` })
      .expect(201);

    const report = await prisma.db.needOutcomeReport.findFirstOrThrow({
      where: { statedNeedId },
      orderBy: { createdAt: 'desc' },
    });
    outcomeReportId = report.id;

    const existingUnresolved = await prisma.db.unresolvedNeed.findFirst({
      where: { statedNeedId },
      orderBy: { createdAt: 'desc' },
    });
    const unresolved =
      existingUnresolved ??
      (await prisma.db.unresolvedNeed.create({
        data: {
          userId: memberId,
          statedNeedId,
          reason: 'NO_CURRENT_ROUTE',
          message: 'No verified route is currently available.',
        },
      }));
    unresolvedNeedId = unresolved.id;

    const unrelatedConversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Unrelated conversation without People responsibility' })
      .expect(201);
    const unrelatedMessage = await prisma.db.aiMessage.create({
      data: {
        conversationId: unrelatedConversation.body.id,
        role: AiMessageRole.USER,
        content: `I already told you about my calendar outside a People responsibility ${marker}`,
      },
    });
    unrelatedMessageId = unrelatedMessage.id;
  });

  afterAll(async () => {
    await prisma.db.needOutcomeReport.deleteMany({ where: { userId: memberId } });
    await prisma.db.unresolvedNeed.deleteMany({ where: { userId: memberId } });
    await prisma.db.responsibility.deleteMany({ where: { principalUserId: memberId } });
    await prisma.db.statedNeed.deleteMany({ where: { userId: memberId } });
    await prisma.db.aiConversation.deleteMany({ where: { userId: memberId } });
    await prisma.db.user.deleteMany({ where: { id: { in: [memberId, adminId] } } });
    await app.close();
  });

  const learningQuery = () => ({
    since: new Date(Date.now() - 5 * 60_000).toISOString(),
    until: new Date(Date.now() + 60_000).toISOString(),
    limit: 50,
  });

  it('is a real runtime route and rejects unauthenticated access', async () => {
    await request(app.getHttpServer())
      .get('/stewardship-learning/candidates')
      .query(learningQuery())
      .expect(401);
  });

  it('keeps the Foundry/governance export unavailable to ordinary members', async () => {
    await request(app.getHttpServer())
      .get('/stewardship-learning/candidates')
      .set('Authorization', `Bearer ${memberToken}`)
      .query(learningQuery())
      .expect(403);
  });

  it('exports privacy-minimized, provenance-separated candidates from canonical evidence', async () => {
    const response = await request(app.getHttpServer())
      .get('/stewardship-learning/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .query(learningQuery())
      .expect(200);

    expect(response.body.contract_version).toBe('1.0.0');

    const feedbackCandidate = response.body.candidates.find(
      (candidate: { event_id: string }) => candidate.event_id === `member-message:${memberMessageId}`,
    );
    expect(feedbackCandidate).toMatchObject({
      work_id: responsibilityId,
      outcome: 'unknown',
      candidate_only: true,
      feedback: {
        signal_kind: 'MEMBER_FRICTION',
        source: {
          system: 'AI_CONVERSATION',
          record_type: 'AiMessage',
          record_id: memberMessageId,
          state: 'USER_MESSAGE',
        },
        source_provenance: 'REPORTED',
        classification_provenance: 'INFERRED',
        capability_hints: ['CALENDAR'],
        causal_attribution: 'UNDETERMINED',
      },
    });

    const outcomeCandidate = response.body.candidates.find(
      (candidate: { event_id: string }) => candidate.event_id === `need-outcome:${outcomeReportId}`,
    );
    expect(outcomeCandidate).toMatchObject({
      work_id: responsibilityId,
      outcome: 'unknown',
      candidate_only: true,
      feedback: {
        signal_kind: 'OUTCOME_REPORTED',
        source: {
          system: 'NEEDS',
          record_type: 'NeedOutcomeReport',
          record_id: outcomeReportId,
        },
        source_provenance: 'REPORTED',
        classification_provenance: 'OBSERVED',
        causal_attribution: 'UNDETERMINED',
      },
    });

    const operationalFailureCandidate = response.body.candidates.find(
      (candidate: { event_id: string }) =>
        candidate.event_id === `unresolved-need:${unresolvedNeedId}`,
    );
    expect(operationalFailureCandidate).toMatchObject({
      work_id: responsibilityId,
      outcome: 'unknown',
      candidate_only: true,
      feedback: {
        signal_kind: 'NO_CURRENT_ROUTE',
        source: {
          system: 'NEEDS',
          record_type: 'UnresolvedNeed',
          record_id: unresolvedNeedId,
        },
        source_provenance: 'OBSERVED',
        classification_provenance: 'OBSERVED',
        causal_attribution: 'NOT_APPLICABLE',
      },
    });

    expect(
      response.body.candidates.some(
        (candidate: { event_id: string }) =>
          candidate.event_id === `member-message:${unrelatedMessageId}`,
      ),
    ).toBe(false);

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain(privateFeedback);
    expect(serialized).not.toContain(marker);
  });
});
