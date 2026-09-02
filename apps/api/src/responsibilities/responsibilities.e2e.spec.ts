import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BenefitType,
  OpportunityCategory,
  OpportunityStatus,
  ResponsibilityContextType,
  ResponsibilityEvidenceLevel,
  ResponsibilityEventType,
  ResponsibilityStatus,
  TrackingStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

describe('Responsibility Core — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  const marker = 'e2e-or001-' + randomUUID();
  let ownerId: string;
  let otherId: string;
  let ownerToken: string;
  let otherToken: string;
  let conversationId: string;
  let otherConversationId: string;
  let opportunityId: string;
  let expiredOpportunityId: string;
  let responsibilityId: string;

  const tokenFor = (id: string, email: string): string =>
    jwt.sign({ sub: id, email, roles: [UserRole.MEMBER] });

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

    const ownerEmail = 'owner-' + marker + '@example.test';
    const otherEmail = 'other-' + marker + '@example.test';
    const owner = await prisma.db.user.create({ data: { email: ownerEmail } });
    const other = await prisma.db.user.create({ data: { email: otherEmail } });
    ownerId = owner.id;
    otherId = other.id;
    ownerToken = tokenFor(ownerId, ownerEmail);
    otherToken = tokenFor(otherId, otherEmail);

    const ownerConversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ title: 'OR-001 owner conversation' })
      .expect(201);
    conversationId = ownerConversation.body.id;

    const otherConversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', 'Bearer ' + otherToken)
      .send({ title: 'OR-001 other conversation' })
      .expect(201);
    otherConversationId = otherConversation.body.id;

    const now = new Date();
    const opportunity = await prisma.db.opportunity.create({
      data: {
        title: 'OR-001 verified opportunity ' + marker,
        shortDescription: 'Verified OR-001 test opportunity',
        fullDescription: 'A verified opportunity used only for the Responsibility Core end-to-end test.',
        category: OpportunityCategory.GRANT,
        provider: 'OR-001 Test Provider',
        officialSourceUrl: 'https://example.test/or001',
        eligibilityRules: 'Integration test only.',
        benefitType: BenefitType.GRANT,
        status: OpportunityStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
        datePublished: now,
        dateLastVerified: now,
        sourceName: 'OR-001 test source',
        submittedById: ownerId,
        createdById: ownerId,
        lastUpdatedById: ownerId,
      },
    });
    opportunityId = opportunity.id;

    const expired = await prisma.db.opportunity.create({
      data: {
        title: 'OR-001 expired opportunity ' + marker,
        shortDescription: 'Expired OR-001 test opportunity',
        fullDescription: 'An expired opportunity used only for the Responsibility Core deny-path test.',
        category: OpportunityCategory.GRANT,
        provider: 'OR-001 Test Provider',
        officialSourceUrl: 'https://example.test/or001-expired',
        eligibilityRules: 'Integration test only.',
        benefitType: BenefitType.GRANT,
        status: OpportunityStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
        deadline: new Date(now.getTime() - 60_000),
        datePublished: now,
        dateLastVerified: now,
        sourceName: 'OR-001 test source',
        submittedById: ownerId,
        createdById: ownerId,
        lastUpdatedById: ownerId,
      },
    });
    expiredOpportunityId = expired.id;
  });

  afterAll(async () => {
    await prisma.db.savedOpportunity.deleteMany({
      where: { opportunityId: { in: [opportunityId, expiredOpportunityId] } },
    });
    await prisma.db.responsibility.deleteMany({
      where: { principalUserId: { in: [ownerId, otherId] } },
    });
    await prisma.db.opportunity.deleteMany({
      where: { id: { in: [opportunityId, expiredOpportunityId] } },
    });
    await prisma.db.user.deleteMany({
      where: { id: { in: [ownerId, otherId] } },
    });
    await app.close();
  });

  it('rejects unauthenticated Responsibility access', async () => {
    await request(app.getHttpServer())
      .post('/responsibilities')
      .send({ conversationId, opportunityId })
      .expect(401);
  });

  it('rejects caller-supplied context/authority surface instead of trusting it', async () => {
    await request(app.getHttpServer())
      .post('/responsibilities')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({
        conversationId,
        opportunityId,
        contextType: 'BUSINESS_TENANT',
      })
      .expect(400);
  });

  it('does not allow another member conversation to become provenance', async () => {
    await request(app.getHttpServer())
      .post('/responsibilities')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ conversationId: otherConversationId, opportunityId })
      .expect(404);
  });

  it('refuses a verified-but-expired opportunity', async () => {
    await request(app.getHttpServer())
      .post('/responsibilities')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ conversationId, opportunityId: expiredOpportunityId })
      .expect(409);
  });

  it('accepts one bounded personal Responsibility with append-only commitment events', async () => {
    const accepted = await request(app.getHttpServer())
      .post('/responsibilities')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ conversationId, opportunityId })
      .expect(201);

    responsibilityId = accepted.body.id;
    expect(accepted.body.contextType).toBe(ResponsibilityContextType.PERSONAL);
    expect(accepted.body.status).toBe(ResponsibilityStatus.ACTIVE);
    expect(accepted.body.originConversationId).toBe(conversationId);
    expect(accepted.body.originOpportunityId).toBe(opportunityId);
    expect(accepted.body.events.map((event: { type: string }) => event.type)).toEqual([
      ResponsibilityEventType.ACCEPTED,
      ResponsibilityEventType.COMMITMENT_RECORDED,
    ]);

    const duplicate = await request(app.getHttpServer())
      .post('/responsibilities')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ conversationId, opportunityId })
      .expect(201);
    expect(duplicate.body.id).toBe(responsibilityId);
  });

  it('returns 404 when another member attempts to read or reconcile the Responsibility', async () => {
    await request(app.getHttpServer())
      .get('/responsibilities/' + responsibilityId)
      .set('Authorization', 'Bearer ' + otherToken)
      .expect(404);

    await request(app.getHttpServer())
      .post('/responsibilities/' + responsibilityId + '/reconcile')
      .set('Authorization', 'Bearer ' + otherToken)
      .expect(404);
  });

  it('persists the Responsibility when the source conversation changes', async () => {
    await prisma.db.aiConversation.update({
      where: { id: conversationId },
      data: { title: 'OR-001 source conversation changed after acceptance' },
    });

    const found = await request(app.getHttpServer())
      .get('/responsibilities/' + responsibilityId)
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(200);

    expect(found.body.id).toBe(responsibilityId);
    expect(found.body.originConversationId).toBe(conversationId);
  });

  it('moves to WAITING_ON_USER until the existing Opportunity domain records a concrete decision', async () => {
    const waiting = await request(app.getHttpServer())
      .post('/responsibilities/' + responsibilityId + '/reconcile')
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(200);

    expect(waiting.body.status).toBe(ResponsibilityStatus.WAITING_ON_USER);
    expect(
      waiting.body.events.filter(
        (event: { type: string }) =>
          event.type === ResponsibilityEventType.USER_INPUT_REQUIRED,
      ),
    ).toHaveLength(1);

    const waitingAgain = await request(app.getHttpServer())
      .post('/responsibilities/' + responsibilityId + '/reconcile')
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(200);
    expect(
      waitingAgain.body.events.filter(
        (event: { type: string }) =>
          event.type === ResponsibilityEventType.USER_INPUT_REQUIRED,
      ),
    ).toHaveLength(1);
  });

  it('completes only the decision criterion from referenced REPORTED domain evidence and remains idempotent', async () => {
    await request(app.getHttpServer())
      .post('/users/' + ownerId + '/saved-opportunities')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ opportunityId })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/users/' + ownerId + '/saved-opportunities/' + opportunityId)
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ trackingStatus: TrackingStatus.APPLYING })
      .expect(200);

    const completed = await request(app.getHttpServer())
      .post('/responsibilities/' + responsibilityId + '/reconcile')
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(200);

    expect(completed.body.status).toBe(ResponsibilityStatus.COMPLETED);
    expect(completed.body.completedAt).toBeTruthy();

    const evidence = completed.body.events.find(
      (event: { type: string }) =>
        event.type === ResponsibilityEventType.ACTION_EVIDENCED,
    );
    expect(evidence.sourceRecordType).toBe('SavedOpportunity');
    expect(evidence.sourceState).toBe(TrackingStatus.APPLYING);
    expect(evidence.evidenceLevel).toBe(ResponsibilityEvidenceLevel.REPORTED);

    const firstEventCount = completed.body.events.length;
    const completedAgain = await request(app.getHttpServer())
      .post('/responsibilities/' + responsibilityId + '/reconcile')
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(200);

    expect(completedAgain.body.status).toBe(ResponsibilityStatus.COMPLETED);
    expect(completedAgain.body.events).toHaveLength(firstEventCount);
  });
});
