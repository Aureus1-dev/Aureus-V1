import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ResponsibilityEvidenceLevel,
  ResponsibilityStatus,
  StewardshipRelationshipOrigin,
  StewardshipRelationshipStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';
import {
  PeopleFollowThroughDueProvenance,
  PeopleFollowThroughState,
} from './people-follow-through.dto';
import { PeopleFollowThroughService } from './people-follow-through.service';

describe('People Step 5 — Obligation & Follow-through E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  let followThrough: PeopleFollowThroughService;

  let ownerId: string;
  let otherId: string;
  let stewardId: string;
  let ownerToken: string;
  let otherToken: string;
  let stewardToken: string;
  let housingNeedId: string;
  let nonHousingNeedId: string;
  let housingResponsibilityId: string;
  let nonHousingResponsibilityId: string;

  const marker = `people-step5-${randomUUID()}`;
  const secretAction = `private-housing-action-${randomUUID()}`;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);
    followThrough = app.get(PeopleFollowThroughService);

    const ownerEmail = `owner-${marker}@example.test`;
    const otherEmail = `other-${marker}@example.test`;
    const stewardEmail = `steward-${marker}@example.test`;
    const [owner, other, steward] = await Promise.all([
      prisma.db.user.create({ data: { email: ownerEmail } }),
      prisma.db.user.create({ data: { email: otherEmail } }),
      prisma.db.user.create({ data: { email: stewardEmail, roles: [UserRole.STEWARD] } }),
    ]);
    ownerId = owner.id;
    otherId = other.id;
    stewardId = steward.id;
    ownerToken = jwt.sign({ sub: ownerId, email: ownerEmail, roles: [UserRole.MEMBER] });
    otherToken = jwt.sign({ sub: otherId, email: otherEmail, roles: [UserRole.MEMBER] });
    stewardToken = jwt.sign({ sub: stewardId, email: stewardEmail, roles: [UserRole.STEWARD] });

    const [housingConversation, nonHousingConversation] = await Promise.all([
      request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Step 5 housing proof' })
        .expect(201),
      request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Step 5 non-housing control' })
        .expect(201),
    ]);

    const [housingNeed, nonHousingNeed] = await Promise.all([
      prisma.db.statedNeed.create({
        data: {
          userId: ownerId,
          conversationId: housingConversation.body.id,
          content: 'I need housing help finding a studio and keeping up with the application deadline.',
        },
      }),
      prisma.db.statedNeed.create({
        data: {
          userId: ownerId,
          conversationId: nonHousingConversation.body.id,
          content: 'I need help finding a job and improving my resume.',
        },
      }),
    ]);
    housingNeedId = housingNeed.id;
    nonHousingNeedId = nonHousingNeed.id;

    const housingAccepted = await request(app.getHttpServer())
      .post('/people/resolutions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ statedNeedId: housingNeedId, objective: 'Help me get into appropriate housing' })
      .expect(201);
    housingResponsibilityId = housingAccepted.body.responsibility.id;

    const nonHousingAccepted = await request(app.getHttpServer())
      .post('/people/resolutions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ statedNeedId: nonHousingNeedId, objective: 'Help me improve my employment situation' })
      .expect(201);
    nonHousingResponsibilityId = nonHousingAccepted.body.responsibility.id;
  });

  afterAll(async () => {
    await prisma.db.stewardshipRelationship.deleteMany({
      where: { memberId: ownerId, stewardId },
    });
    await prisma.db.responsibility.deleteMany({ where: { principalUserId: ownerId } });
    await prisma.db.statedNeed.deleteMany({ where: { userId: ownerId } });
    await prisma.db.user.deleteMany({ where: { id: { in: [ownerId, otherId, stewardId] } } });
    await app.close();
  });

  it('requires authentication and keeps the first proof bounded to canonical housing needs', async () => {
    const body = {
      kind: 'CALLBACK',
      owner: 'AUREUS',
      requiredAction: secretAction,
      dueAt: '2026-10-01T15:00:00.000Z',
      dueTimeZone: 'America/New_York',
    };

    await request(app.getHttpServer())
      .post(`/people/follow-through/${housingResponsibilityId}/housing`)
      .send(body)
      .expect(401);

    await request(app.getHttpServer())
      .post(`/people/follow-through/${nonHousingResponsibilityId}/housing`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(body)
      .expect(409);
  });

  it('records a member-created housing due date as REPORTED and rejects caller-supplied verification', async () => {
    await request(app.getHttpServer())
      .post(`/people/follow-through/${housingResponsibilityId}/housing`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        kind: 'CALLBACK',
        owner: 'AUREUS',
        requiredAction: secretAction,
        dueAt: '2026-10-01T15:00:00.000Z',
        dueTimeZone: 'America/New_York',
        dueProvenance: 'VERIFIED',
      })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post(`/people/follow-through/${housingResponsibilityId}/housing`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        kind: 'CALLBACK',
        owner: 'AUREUS',
        requiredAction: secretAction,
        dueAt: '2026-10-01T15:00:00.000Z',
        dueTimeZone: 'America/New_York',
        dueBasis: 'The property office told me to call back by then.',
      })
      .expect(201);

    expect(created.body.dueProvenance).toBe(PeopleFollowThroughDueProvenance.REPORTED);
    expect(created.body.state).toBe(PeopleFollowThroughState.PENDING);

    const stored = await prisma.db.responsibility.findUniqueOrThrow({
      where: { id: housingResponsibilityId },
    });
    expect(stored.dueAt?.toISOString()).toBe('2026-10-01T15:00:00.000Z');
    expect(JSON.stringify(stored.successCriteria)).toContain('"dueProvenance":"REPORTED"');
  });

  it('keeps the Obligation private from another member', async () => {
    await request(app.getHttpServer())
      .get(`/people/follow-through/${housingResponsibilityId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('requires current Human Steward assignment for source-backed verification', async () => {
    await request(app.getHttpServer())
      .post(`/people/follow-through/${housingResponsibilityId}/due-verification`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({
        dueAt: '2026-10-02T16:00:00.000Z',
        sourceSystem: 'PROPERTY_PROVIDER',
        sourceRecordType: 'AppointmentConfirmation',
        sourceRecordId: 'confirmation-001',
        sourceState: 'CONFIRMED',
      })
      .expect(403);

    await prisma.db.stewardshipRelationship.create({
      data: {
        memberId: ownerId,
        stewardId,
        status: StewardshipRelationshipStatus.ACTIVE,
        origin: StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT,
        assignedById: stewardId,
        activatedAt: new Date(),
      },
    });

    const verified = await request(app.getHttpServer())
      .post(`/people/follow-through/${housingResponsibilityId}/due-verification`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({
        dueAt: '2026-10-02T16:00:00.000Z',
        dueBasis: 'Provider confirmation',
        sourceSystem: 'PROPERTY_PROVIDER',
        sourceRecordType: 'AppointmentConfirmation',
        sourceRecordId: 'confirmation-001',
        sourceState: 'CONFIRMED',
      })
      .expect(201);

    expect(verified.body.dueProvenance).toBe(PeopleFollowThroughDueProvenance.VERIFIED);
    expect(verified.body.dueAt).toBe('2026-10-02T16:00:00.000Z');

    const evidence = await prisma.db.responsibilityEvent.findFirst({
      where: {
        responsibilityId: housingResponsibilityId,
        sourceRecordType: 'AppointmentConfirmation',
        sourceRecordId: 'confirmation-001',
      },
      orderBy: { occurredAt: 'desc' },
    });
    expect(evidence?.evidenceLevel).toBe(ResponsibilityEvidenceLevel.VERIFIED);
  });

  it('does not let a later member report silently overwrite a verified due date', async () => {
    const response = await request(app.getHttpServer())
      .post(`/people/follow-through/${housingResponsibilityId}/due-change`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        dueAt: '2026-10-05T18:00:00.000Z',
        dueBasis: 'I heard the date may have changed.',
      })
      .expect(201);

    expect(response.body.state).toBe(PeopleFollowThroughState.DISPUTED);
    expect(response.body.dueAt).toBe('2026-10-02T16:00:00.000Z');
    expect(response.body.reviewRequired).toBe(true);

    const stored = await prisma.db.responsibility.findUniqueOrThrow({
      where: { id: housingResponsibilityId },
    });
    expect(stored.dueAt?.toISOString()).toBe('2026-10-02T16:00:00.000Z');
  });

  it('keeps the assigned queue minimum-necessary and does not leak private action text', async () => {
    const response = await request(app.getHttpServer())
      .get('/people/follow-through/assigned')
      .set('Authorization', `Bearer ${stewardToken}`)
      .expect(200);

    const serialized = JSON.stringify(response.body);
    expect(serialized).toContain(housingResponsibilityId);
    expect(serialized).not.toContain(secretAction);
    expect(serialized).not.toContain('requiredAction');
  });

  it('records Obligation satisfaction without completing the underlying Personal Need Responsibility', async () => {
    const reported = await request(app.getHttpServer())
      .post(`/people/follow-through/${housingResponsibilityId}/satisfaction-report`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ note: 'The callback happened.' })
      .expect(201);
    expect(reported.body.state).toBe(PeopleFollowThroughState.SATISFIED_REPORTED);

    let responsibility = await prisma.db.responsibility.findUniqueOrThrow({
      where: { id: housingResponsibilityId },
    });
    expect(responsibility.status).not.toBe(ResponsibilityStatus.COMPLETED);

    const verified = await request(app.getHttpServer())
      .post(`/people/follow-through/${housingResponsibilityId}/satisfaction-verification`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({
        sourceSystem: 'PROPERTY_PROVIDER',
        sourceRecordType: 'CallbackReceipt',
        sourceRecordId: 'callback-001',
        sourceState: 'COMPLETED',
      })
      .expect(201);
    expect(verified.body.state).toBe(PeopleFollowThroughState.SATISFIED_VERIFIED);

    responsibility = await prisma.db.responsibility.findUniqueOrThrow({
      where: { id: housingResponsibilityId },
    });
    expect(responsibility.status).not.toBe(ResponsibilityStatus.COMPLETED);
    expect(responsibility.completedAt).toBeNull();
  });

  it('marks an overdue Obligation for review without fabricating escalation or terminal outcome', async () => {
    const conversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Step 5 overdue proof' })
      .expect(201);
    const need = await prisma.db.statedNeed.create({
      data: {
        userId: otherId,
        conversationId: conversation.body.id,
        content: 'I need housing help with a rent deadline.',
      },
    });
    const accepted = await request(app.getHttpServer())
      .post('/people/resolutions')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ statedNeedId: need.id, objective: 'Help me keep this housing process moving' })
      .expect(201);
    const responsibilityId = accepted.body.responsibility.id;

    await request(app.getHttpServer())
      .post(`/people/follow-through/${responsibilityId}/housing`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        kind: 'DEADLINE',
        owner: 'AUREUS',
        requiredAction: 'Check the housing deadline',
        dueAt: '2026-01-01T12:00:00.000Z',
        dueTimeZone: 'America/New_York',
      })
      .expect(201);

    const beforeNeedEscalations = await prisma.db.needEscalation.count({ where: { userId: otherId } });
    const beforeStewardEscalations = await prisma.db.stewardshipEscalation.count();
    await followThrough.runFollowThroughSweep();

    const state = await request(app.getHttpServer())
      .get(`/people/follow-through/${responsibilityId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect(state.body.state).toBe(PeopleFollowThroughState.MISSED);
    expect(state.body.reviewRequired).toBe(true);

    const responsibility = await prisma.db.responsibility.findUniqueOrThrow({
      where: { id: responsibilityId },
    });
    expect(responsibility.status).not.toBe(ResponsibilityStatus.COMPLETED);
    expect(responsibility.status).not.toBe(ResponsibilityStatus.RESPONSIBLY_EXHAUSTED);
    expect(await prisma.db.needEscalation.count({ where: { userId: otherId } })).toBe(beforeNeedEscalations);
    expect(await prisma.db.stewardshipEscalation.count()).toBe(beforeStewardEscalations);
  });
});
