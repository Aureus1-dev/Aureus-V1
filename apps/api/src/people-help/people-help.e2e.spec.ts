import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BenefitType,
  OpportunityCategory,
  OpportunityStatus,
  ResponsibilityEvidenceLevel,
  ResponsibilityKind,
  ResponsibilityStatus,
  TrackingStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

describe('OR-002 People help-to-completion — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  const marker = 'or002-' + randomUUID();
  let ownerId: string;
  let otherId: string;
  let ownerToken: string;
  let otherToken: string;
  let conversationId: string;
  let otherConversationId: string;
  let opportunityId: string;
  let unverifiedOpportunityId: string;
  let responsibilityId: string;
  let sessionId: string;

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
      .send({ title: 'OR-002 owner conversation' })
      .expect(201);
    conversationId = ownerConversation.body.id;

    const otherConversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', 'Bearer ' + otherToken)
      .send({ title: 'OR-002 other conversation' })
      .expect(201);
    otherConversationId = otherConversation.body.id;

    const now = new Date();
    const opportunity = await prisma.db.opportunity.create({
      data: {
        title: 'OR-002 verified assistance ' + marker,
        shortDescription: 'Verified OR-002 application assistance',
        fullDescription:
          'A verified opportunity used only for the People help-to-completion test.',
        category: OpportunityCategory.GOVERNMENT_BENEFIT,
        provider: 'OR-002 Test Provider',
        officialSourceUrl: 'https://example.test/or002/apply',
        eligibilityRules: 'Integration test only.',
        benefitType: BenefitType.GRANT,
        status: OpportunityStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
        datePublished: now,
        dateLastVerified: now,
        sourceName: 'OR-002 test source',
        submittedById: ownerId,
        createdById: ownerId,
        lastUpdatedById: ownerId,
      },
    });
    opportunityId = opportunity.id;

    const unverified = await prisma.db.opportunity.create({
      data: {
        title: 'OR-002 unverified assistance ' + marker,
        shortDescription: 'Unverified OR-002 application assistance',
        fullDescription:
          'An unverified opportunity used only for the OR-002 deny path.',
        category: OpportunityCategory.GOVERNMENT_BENEFIT,
        provider: 'OR-002 Test Provider',
        officialSourceUrl: 'https://example.test/or002/unverified',
        eligibilityRules: 'Integration test only.',
        benefitType: BenefitType.GRANT,
        status: OpportunityStatus.ACTIVE,
        verificationStatus: VerificationStatus.PENDING_REVIEW,
        datePublished: now,
        sourceName: 'OR-002 test source',
        submittedById: ownerId,
        createdById: ownerId,
        lastUpdatedById: ownerId,
      },
    });
    unverifiedOpportunityId = unverified.id;
  });

  afterAll(async () => {
    await prisma.db.savedOpportunity.deleteMany({
      where: {
        userId: { in: [ownerId, otherId] },
        opportunityId: { in: [opportunityId, unverifiedOpportunityId] },
      },
    });
    await prisma.db.guidedApplicationSession.deleteMany({
      where: { userId: { in: [ownerId, otherId] } },
    });
    await prisma.db.responsibility.deleteMany({
      where: { principalUserId: { in: [ownerId, otherId] } },
    });
    await prisma.db.opportunity.deleteMany({
      where: { id: { in: [opportunityId, unverifiedOpportunityId] } },
    });
    await prisma.db.user.deleteMany({
      where: { id: { in: [ownerId, otherId] } },
    });
    await app.close();
  });

  it('requires authentication and rejects caller-supplied authority/context fields', async () => {
    await request(app.getHttpServer())
      .post('/people-help/application')
      .send({ conversationId, opportunityId })
      .expect(401);

    await request(app.getHttpServer())
      .post('/people-help/application')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({
        conversationId,
        opportunityId,
        contextType: 'BUSINESS_TENANT',
      })
      .expect(400);
  });

  it('does not allow another member conversation or unverified opportunity to seed help', async () => {
    await request(app.getHttpServer())
      .post('/people-help/application')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({
        conversationId: otherConversationId,
        opportunityId,
      })
      .expect(404);

    await request(app.getHttpServer())
      .post('/people-help/application')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({
        conversationId,
        opportunityId: unverifiedOpportunityId,
      })
      .expect(409);
  });

  it('accepts one private application-help Responsibility and reuses it on duplicate start', async () => {
    const first = await request(app.getHttpServer())
      .post('/people-help/application')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ conversationId, opportunityId })
      .expect(201);

    responsibilityId = first.body.responsibility.id;
    sessionId = first.body.session.id;

    expect(first.body.responsibility.kind).toBe(
      ResponsibilityKind.OPPORTUNITY_APPLICATION_GUIDANCE,
    );
    expect(first.body.responsibility.status).toBe(ResponsibilityStatus.ACTIVE);
    expect(first.body.responsibility.contextType).toBe('PERSONAL');
    expect(first.body.responsibility.authorityClass).toBe('GUIDANCE_ONLY');
    expect(first.body.responsibility.privacyScope).toBe('PERSONAL_PRIVATE');

    const duplicate = await request(app.getHttpServer())
      .post('/people-help/application')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ conversationId, opportunityId })
      .expect(201);

    expect(duplicate.body.responsibility.id).toBe(responsibilityId);
    expect(duplicate.body.session.id).toBe(sessionId);
  });

  it('does not let another member mutate the active guide', async () => {
    await request(app.getHttpServer())
      .post('/people-help/application/' + sessionId + '/pause')
      .set('Authorization', 'Bearer ' + otherToken)
      .expect(404);
  });

  it('pauses, survives reload without an active guide, then resumes the same Responsibility', async () => {
    const paused = await request(app.getHttpServer())
      .post('/people-help/application/' + sessionId + '/pause')
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(201);

    expect(paused.body.responsibility.id).toBe(responsibilityId);
    expect(paused.body.responsibility.status).toBe(
      ResponsibilityStatus.WAITING_ON_USER,
    );

    const current = await request(app.getHttpServer())
      .get(
        '/people-help/application/active?conversationId=' + conversationId,
      )
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(200);

    expect(current.body.session).toBeNull();
    expect(current.body.responsibility.id).toBe(responsibilityId);
    expect(current.body.responsibility.status).toBe(
      ResponsibilityStatus.WAITING_ON_USER,
    );

    const resumed = await request(app.getHttpServer())
      .post('/people-help/application')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ conversationId, opportunityId })
      .expect(201);

    expect(resumed.body.responsibility.id).toBe(responsibilityId);
    expect(resumed.body.responsibility.status).toBe(
      ResponsibilityStatus.ACTIVE,
    );
    expect(resumed.body.session.id).not.toBe(sessionId);
    sessionId = resumed.body.session.id;

    const stateChanges = resumed.body.responsibility.events.filter(
      (event: { type: string }) => event.type === 'STATE_CHANGED',
    );
    expect(stateChanges).toHaveLength(1);
  });

  it('records APPLIED only from explicit member action and labels completion evidence REPORTED', async () => {
    const completed = await request(app.getHttpServer())
      .post('/people-help/application/' + sessionId + '/outcome')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ outcome: TrackingStatus.APPLIED })
      .expect(201);

    expect(completed.body.responsibility.id).toBe(responsibilityId);
    expect(completed.body.responsibility.status).toBe(
      ResponsibilityStatus.COMPLETED,
    );
    expect(completed.body.ended).toBe(true);
    expect(completed.body.outcome).toBe(TrackingStatus.APPLIED);

    const completionEvent = completed.body.responsibility.events.find(
      (event: { type: string }) => event.type === 'COMPLETED',
    );
    expect(completionEvent.sourceRecordType).toBe('SavedOpportunity');
    expect(completionEvent.sourceState).toBe(TrackingStatus.APPLIED);
    expect(completionEvent.evidenceLevel).toBe(
      ResponsibilityEvidenceLevel.REPORTED,
    );

    const saved = await prisma.db.savedOpportunity.findUnique({
      where: {
        userId_opportunityId: {
          userId: ownerId,
          opportunityId,
        },
      },
    });
    expect(saved?.trackingStatus).toBe(TrackingStatus.APPLIED);
  });

  it('returns completed private progress on a later reload without reopening it', async () => {
    const current = await request(app.getHttpServer())
      .get(
        '/people-help/application/active?conversationId=' + conversationId,
      )
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(200);

    expect(current.body.session).toBeNull();
    expect(current.body.responsibility.id).toBe(responsibilityId);
    expect(current.body.responsibility.status).toBe(
      ResponsibilityStatus.COMPLETED,
    );

    const count = await prisma.db.responsibility.count({
      where: {
        principalUserId: ownerId,
        originOpportunityId: opportunityId,
        kind: ResponsibilityKind.OPPORTUNITY_APPLICATION_GUIDANCE,
      },
    });
    expect(count).toBe(1);
  });
});
