import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NeedOutcomeStatus,
  ResponsibilityContextType,
  ResponsibilityEvidenceLevel,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  ResponsibilityStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

describe('People Step 1 — Universal Need to Resolution E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  let ownerId: string;
  let otherId: string;
  let ownerToken: string;
  let otherToken: string;
  let conversationId: string;
  let otherConversationId: string;
  let statedNeedId: string;
  let otherNeedId: string;
  let responsibilityId: string;

  const marker = 'people-step1-' + randomUUID();
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

    const ownerEmail = `owner-${marker}@example.test`;
    const otherEmail = `other-${marker}@example.test`;
    const owner = await prisma.db.user.create({ data: { email: ownerEmail } });
    const other = await prisma.db.user.create({ data: { email: otherEmail } });
    ownerId = owner.id;
    otherId = other.id;
    ownerToken = tokenFor(ownerId, ownerEmail);
    otherToken = tokenFor(otherId, otherEmail);

    const ownerConversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'People Step 1 owner conversation' })
      .expect(201);
    conversationId = ownerConversation.body.id;

    const otherConversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'People Step 1 other conversation' })
      .expect(201);
    otherConversationId = otherConversation.body.id;

    const ownedNeed = await prisma.db.statedNeed.create({
      data: {
        userId: ownerId,
        conversationId,
        content: 'I need help understanding a unique personal situation.',
      },
    });
    statedNeedId = ownedNeed.id;

    const foreignNeed = await prisma.db.statedNeed.create({
      data: {
        userId: otherId,
        conversationId: otherConversationId,
        content: 'I need help understanding another unique situation.',
      },
    });
    otherNeedId = foreignNeed.id;
  });

  afterAll(async () => {
    await prisma.db.needOutcomeReport.deleteMany({
      where: { userId: { in: [ownerId, otherId] } },
    });
    await prisma.db.responsibility.deleteMany({
      where: { principalUserId: { in: [ownerId, otherId] } },
    });
    await prisma.db.statedNeed.deleteMany({
      where: { userId: { in: [ownerId, otherId] } },
    });
    await prisma.db.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await app.close();
  });

  it('rejects unauthenticated resolution acceptance', async () => {
    await request(app.getHttpServer())
      .post('/people/resolutions')
      .send({ statedNeedId, objective: 'Carry this need with me' })
      .expect(401);
  });

  it('does not allow another member stated need to become provenance', async () => {
    await request(app.getHttpServer())
      .post('/people/resolutions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ statedNeedId: otherNeedId, objective: 'Carry a foreign need' })
      .expect(404);
  });

  it('rejects caller-supplied context or authority instead of trusting it', async () => {
    await request(app.getHttpServer())
      .post('/people/resolutions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        statedNeedId,
        objective: 'Carry this need with me',
        contextType: 'BUSINESS_TENANT',
      })
      .expect(400);
  });

  it('accepts one private guidance-only Personal Need Responsibility without granting authority', async () => {
    const beforeGrants = await prisma.db.authorityGrant.count({
      where: { subjectUserId: ownerId },
    });

    const response = await request(app.getHttpServer())
      .post('/people/resolutions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ statedNeedId, objective: 'Help me get this situation resolved' })
      .expect(201);

    responsibilityId = response.body.responsibility.id;
    expect(response.body.responsibility.kind).toBe(ResponsibilityKind.PERSONAL_NEED_RESOLUTION);
    expect(response.body.responsibility.contextType).toBe(ResponsibilityContextType.PERSONAL);
    expect(response.body.responsibility.privacyScope).toBe(ResponsibilityPrivacyScope.PERSONAL_PRIVATE);
    expect(response.body.responsibility.authorityClass).toBe('GUIDANCE_ONLY');
    expect(response.body.memberActionRequired).toBe(true);
    expect(
      await prisma.db.authorityGrant.count({ where: { subjectUserId: ownerId } }),
    ).toBe(beforeGrants);
  });

  it('returns the same open Responsibility on retry and hides it from another member', async () => {
    const retry = await request(app.getHttpServer())
      .post('/people/resolutions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ statedNeedId, objective: 'A retry must not duplicate the promise' })
      .expect(201);
    expect(retry.body.responsibility.id).toBe(responsibilityId);

    await request(app.getHttpServer())
      .get(`/people/resolutions/${responsibilityId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('keeps the need open when the member reports it is still unresolved', async () => {
    const response = await request(app.getHttpServer())
      .post(`/people/resolutions/${responsibilityId}/outcome`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ resolved: false, note: 'This still needs work.' })
      .expect(201);

    expect(response.body.responsibility.status).not.toBe(ResponsibilityStatus.COMPLETED);
    const report = await prisma.db.needOutcomeReport.findFirst({
      where: { statedNeedId, status: NeedOutcomeStatus.STILL_UNRESOLVED },
      orderBy: { createdAt: 'desc' },
    });
    expect(report).not.toBeNull();
  });

  it('completes only from explicit underlying-need outcome evidence and preserves REPORTED truth', async () => {
    const response = await request(app.getHttpServer())
      .post(`/people/resolutions/${responsibilityId}/outcome`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ resolved: true, note: 'The underlying situation is resolved now.' })
      .expect(201);

    expect(response.body.responsibility.status).toBe(ResponsibilityStatus.COMPLETED);
    expect(response.body.evidenceMeaning).toContain('not representing that report as independent');

    const completed = await prisma.db.responsibility.findUniqueOrThrow({
      where: { id: responsibilityId },
      include: { events: true },
    });
    const completion = completed.events.find((event) => event.type === 'COMPLETED');
    expect(completion?.sourceRecordType).toBe('NeedOutcomeReport');
    expect(completion?.sourceState).toBe(NeedOutcomeStatus.RESOLVED);
    expect(completion?.evidenceLevel).toBe(ResponsibilityEvidenceLevel.REPORTED);
  });

  it('does not reopen terminal work on retry of the same StatedNeed', async () => {
    const retry = await request(app.getHttpServer())
      .post('/people/resolutions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ statedNeedId, objective: 'Try again after completion' })
      .expect(201);

    expect(retry.body.responsibility.id).toBe(responsibilityId);
    expect(retry.body.responsibility.status).toBe(ResponsibilityStatus.COMPLETED);
    expect(
      await prisma.db.responsibility.count({
        where: {
          principalUserId: ownerId,
          kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
          originConversationId: conversationId,
        },
      }),
    ).toBe(1);
  });
});
