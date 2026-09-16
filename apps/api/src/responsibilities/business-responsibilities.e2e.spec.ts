import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  OrganizationMemberRole,
  OrganizationType,
  ResponsibilityEvidenceLevel,
  ResponsibilityEventType,
  ResponsibilityStatus,
} from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

describe('Business Responsibilities & Promises — E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  const marker = `step3-${randomUUID()}`;

  const users: Record<string, { id: string; token: string }> = {};
  let orgId: string;
  let otherOrgId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    authService = app.get(AuthService);

    async function register(label: string) {
      // This suite is testing Business Responsibilities, not auth throttling.
      // Use the real registration service so fixture setup does not consume the
      // production 5/minute per-IP credential throttle and fail after user five.
      const response = await authService.register({
        email: `${label}-${marker}@example.test`,
        password: 'Str0ng!Passw0rd',
      });
      users[label] = {
        id: response.user.id,
        token: response.tokens.accessToken,
      };
    }

    for (const label of ['owner', 'admin', 'manager', 'operator', 'viewer', 'member', 'outsider']) {
      await register(label);
    }

    const org = await prisma.db.organization.create({
      data: {
        name: `Step 3 Business ${marker}`,
        shortDescription: 'test',
        fullDescription: 'test',
        organizationType: OrganizationType.BUSINESS,
        websiteUrl: 'https://example.test',
        createdById: users.owner.id,
        lastUpdatedById: users.owner.id,
        members: {
          create: [
            { userId: users.owner.id, role: OrganizationMemberRole.OWNER },
            { userId: users.admin.id, role: OrganizationMemberRole.ADMIN },
            { userId: users.manager.id, role: OrganizationMemberRole.MANAGER },
            { userId: users.operator.id, role: OrganizationMemberRole.OPERATOR },
            { userId: users.viewer.id, role: OrganizationMemberRole.VIEWER },
            { userId: users.member.id, role: OrganizationMemberRole.MEMBER },
          ],
        },
      },
    });
    orgId = org.id;

    const other = await prisma.db.organization.create({
      data: {
        name: `Other Step 3 Business ${marker}`,
        shortDescription: 'test',
        fullDescription: 'test',
        organizationType: OrganizationType.BUSINESS,
        websiteUrl: 'https://other.example.test',
        createdById: users.outsider.id,
        lastUpdatedById: users.outsider.id,
        members: { create: { userId: users.outsider.id, role: OrganizationMemberRole.OWNER } },
      },
    });
    otherOrgId = other.id;
  });

  afterAll(async () => {
    await prisma.db.organization.deleteMany({
      where: { id: { in: [orgId, otherOrgId].filter(Boolean) } },
    });
    await prisma.db.user.deleteMany({
      where: { id: { in: Object.values(users).map((user) => user.id) } },
    });
    await app.close();
  });

  const auth = (label: string) => ({ Authorization: `Bearer ${users[label].token}` });
  const url = (suffix = '') => `/organizations/${orgId}/responsibilities${suffix}`;
  const createBody = (requestKey = randomUUID()) => ({
    requestKey,
    objective: 'Prepare the approved scope for the customer follow-up',
    promise:
      'Aureus will carry this work until the success criterion is reported complete or the business cancels it.',
    criterion: 'The approved scope is ready for the next business action.',
    dueAt: new Date(Date.now() + 86_400_000).toISOString(),
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get(url()).expect(401);
  });

  it('creates one durable Business promise with atomic accepted + commitment events and idempotent replay', async () => {
    const requestKey = randomUUID();
    const body = createBody(requestKey);

    const first = await request(app.getHttpServer())
      .post(url())
      .set(auth('operator'))
      .send(body)
      .expect(201);

    expect(first.body.status).toBe(ResponsibilityStatus.ACTIVE);
    expect(first.body.contextType).toBe('BUSINESS_TENANT');
    expect(first.body.privacyScope).toBe('BUSINESS_PRIVATE');
    expect(first.body.authorityClass).toBe('GUIDANCE_ONLY');
    expect(first.body.kind).toBe('BUSINESS_PROMISE');
    expect(first.body.successCriteria).toMatchObject({
      type: 'BUSINESS_PROMISE_REPORTED_COMPLETION',
      requestKey,
      completionEvidence: 'CURRENT_MANAGER_ATTESTATION',
    });
    expect(first.body.events.map((event: { type: string }) => event.type)).toEqual([
      ResponsibilityEventType.ACCEPTED,
      ResponsibilityEventType.COMMITMENT_RECORDED,
    ]);

    const replay = await request(app.getHttpServer())
      .post(url())
      .set(auth('operator'))
      .send(body)
      .expect(201);
    expect(replay.body.id).toBe(first.body.id);

    const rows = await prisma.db.responsibility.findMany({
      where: { principalOrganizationId: orgId },
    });
    expect(
      rows.filter(
        (row) => (row.successCriteria as { requestKey?: string }).requestKey === requestKey,
      ),
    ).toHaveLength(1);
  });

  it('serializes concurrent duplicate acceptance into one promise', async () => {
    const requestKey = randomUUID();
    const body = createBody(requestKey);
    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post(url()).set(auth('operator')).send(body),
      request(app.getHttpServer()).post(url()).set(auth('operator')).send(body),
    ]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.id).toBe(b.body.id);
  });

  it('keeps mutation roles least-privileged while every current tenant member can read', async () => {
    await request(app.getHttpServer())
      .post(url())
      .set(auth('viewer'))
      .send(createBody())
      .expect(403);
    await request(app.getHttpServer())
      .post(url())
      .set(auth('member'))
      .send(createBody())
      .expect(403);

    const created = await request(app.getHttpServer())
      .post(url())
      .set(auth('operator'))
      .send(createBody())
      .expect(201);

    await request(app.getHttpServer())
      .get(url(`/${created.body.id}`))
      .set(auth('viewer'))
      .expect(200);
    await request(app.getHttpServer())
      .get(url(`/${created.body.id}`))
      .set(auth('member'))
      .expect(200);

    await request(app.getHttpServer())
      .post(url(`/${created.body.id}/complete`))
      .set(auth('operator'))
      .send({ confirmed: true })
      .expect(403);
    await request(app.getHttpServer())
      .post(url(`/${created.body.id}/cancel`))
      .set(auth('operator'))
      .send({})
      .expect(403);
  });

  it('never leaks or mutates a responsibility across tenants', async () => {
    const created = await request(app.getHttpServer())
      .post(url())
      .set(auth('manager'))
      .send(createBody())
      .expect(201);

    await request(app.getHttpServer())
      .get(url(`/${created.body.id}`))
      .set(auth('outsider'))
      .expect(404);
    await request(app.getHttpServer())
      .post(url(`/${created.body.id}/needs-you`))
      .set(auth('outsider'))
      .send({})
      .expect(404);

    await request(app.getHttpServer())
      .get(`/organizations/${otherOrgId}/responsibilities/${created.body.id}`)
      .set(auth('outsider'))
      .expect(404);
  });

  it('supports needs-you → resume and records only the canonical state events', async () => {
    const created = await request(app.getHttpServer())
      .post(url())
      .set(auth('operator'))
      .send(createBody())
      .expect(201);

    const waiting = await request(app.getHttpServer())
      .post(url(`/${created.body.id}/needs-you`))
      .set(auth('operator'))
      .send({})
      .expect(201);
    expect(waiting.body.status).toBe(ResponsibilityStatus.WAITING_ON_USER);
    expect(waiting.body.events.at(-1).type).toBe(ResponsibilityEventType.USER_INPUT_REQUIRED);

    const waitingReplay = await request(app.getHttpServer())
      .post(url(`/${created.body.id}/needs-you`))
      .set(auth('operator'))
      .send({})
      .expect(201);
    expect(waitingReplay.body.events).toHaveLength(waiting.body.events.length);

    const active = await request(app.getHttpServer())
      .post(url(`/${created.body.id}/resume`))
      .set(auth('operator'))
      .send({})
      .expect(201);
    expect(active.body.status).toBe(ResponsibilityStatus.ACTIVE);
    expect(active.body.events.at(-1).type).toBe(ResponsibilityEventType.STATE_CHANGED);

    const activeReplay = await request(app.getHttpServer())
      .post(url(`/${created.body.id}/resume`))
      .set(auth('operator'))
      .send({})
      .expect(201);
    expect(activeReplay.body.events).toHaveLength(active.body.events.length);
  });

  it('communicates attention idempotently to current managers and never across roles or tenants', async () => {
    const body = createBody();
    const created = await request(app.getHttpServer())
      .post(url())
      .set(auth('operator'))
      .send(body)
      .expect(201);

    const acceptedKey = `business-responsibility:${created.body.id}:accepted`;
    const accepted = await prisma.db.notification.findMany({
      where: { dedupeKey: acceptedKey },
      orderBy: { recipientId: 'asc' },
    });
    expect(accepted.map((notification) => notification.recipientId).sort()).toEqual(
      [users.owner.id, users.admin.id, users.manager.id].sort(),
    );

    await request(app.getHttpServer()).post(url()).set(auth('operator')).send(body).expect(201);
    expect(await prisma.db.notification.count({ where: { dedupeKey: acceptedKey } })).toBe(3);

    await request(app.getHttpServer())
      .post(url(`/${created.body.id}/needs-you`))
      .set(auth('operator'))
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(url(`/${created.body.id}/needs-you`))
      .set(auth('operator'))
      .send({})
      .expect(201);

    const needsYouKey = `business-responsibility:${created.body.id}:needs_you`;
    const needsYou = await prisma.db.notification.findMany({ where: { dedupeKey: needsYouKey } });
    expect(needsYou).toHaveLength(3);
    expect(needsYou.flatMap((notification) => Object.keys(notification.data ?? {})).sort()).toEqual(
      [
        'organizationId',
        'responsibilityId',
        'status',
        'organizationId',
        'responsibilityId',
        'status',
        'organizationId',
        'responsibilityId',
        'status',
      ].sort(),
    );

    await request(app.getHttpServer())
      .post(url(`/${created.body.id}/complete`))
      .set(auth('manager'))
      .send({ confirmed: true })
      .expect(201);

    const completed = await prisma.db.notification.findMany({
      where: { dedupeKey: `business-responsibility:${created.body.id}:completed_reported` },
    });
    expect(completed.map((notification) => notification.recipientId).sort()).toEqual(
      [users.owner.id, users.admin.id].sort(),
    );
    expect(
      completed.every(
        (notification) =>
          (notification.data as { evidenceLevel?: string }).evidenceLevel === 'REPORTED',
      ),
    ).toBe(true);
  });

  it('lets a current manager report completion but never overclaims verified evidence', async () => {
    const authorityBefore = await prisma.db.authorityGrant.count({
      where: { organizationId: orgId },
    });
    const stateBefore = await prisma.db.authorityCapabilityState.count({
      where: { organizationId: orgId },
    });

    const created = await request(app.getHttpServer())
      .post(url())
      .set(auth('operator'))
      .send(createBody())
      .expect(201);

    await request(app.getHttpServer())
      .post(url(`/${created.body.id}/complete`))
      .set(auth('manager'))
      .send({ confirmed: false })
      .expect(400);

    const completed = await request(app.getHttpServer())
      .post(url(`/${created.body.id}/complete`))
      .set(auth('manager'))
      .send({ confirmed: true })
      .expect(201);

    expect(completed.body.status).toBe(ResponsibilityStatus.COMPLETED);
    const evidence = completed.body.events.filter((event: { type: string }) =>
      [ResponsibilityEventType.ACTION_EVIDENCED, ResponsibilityEventType.COMPLETED].includes(
        event.type as ResponsibilityEventType,
      ),
    );
    expect(evidence).toHaveLength(2);
    for (const event of evidence) {
      expect(event.sourceSystem).toBe('AUREUS_BUSINESS');
      expect(event.sourceRecordType).toBe('OrganizationMemberAttestation');
      expect(event.sourceRecordId).toBe(users.manager.id);
      expect(event.sourceState).toBe('MANAGER_CONFIRMED');
      expect(event.evidenceLevel).toBe(ResponsibilityEvidenceLevel.REPORTED);
      expect(event.evidenceLevel).not.toBe(ResponsibilityEvidenceLevel.VERIFIED);
    }

    const replay = await request(app.getHttpServer())
      .post(url(`/${created.body.id}/complete`))
      .set(auth('manager'))
      .send({ confirmed: true })
      .expect(201);
    expect(replay.body.events).toHaveLength(completed.body.events.length);

    const receipt = await request(app.getHttpServer())
      .get(url(`/${created.body.id}/evidence`))
      .set(auth('member'))
      .expect(200);
    expect(receipt.body.evidenceSummary).toContain('reported');
    expect(receipt.body.evidenceSummary).toContain('does not claim independent verification');
    expect(receipt.body.lifecycle.at(-1).evidenceLevel).toBe(ResponsibilityEvidenceLevel.REPORTED);

    await request(app.getHttpServer())
      .get(`/organizations/${otherOrgId}/responsibilities/${created.body.id}/evidence`)
      .set(auth('outsider'))
      .expect(404);

    expect(await prisma.db.authorityGrant.count({ where: { organizationId: orgId } })).toBe(
      authorityBefore,
    );
    expect(
      await prisma.db.authorityCapabilityState.count({ where: { organizationId: orgId } }),
    ).toBe(stateBefore);
  });

  it('cancels truthfully and never reopens a terminal responsibility', async () => {
    const created = await request(app.getHttpServer())
      .post(url())
      .set(auth('admin'))
      .send(createBody())
      .expect(201);

    const cancelled = await request(app.getHttpServer())
      .post(url(`/${created.body.id}/cancel`))
      .set(auth('admin'))
      .send({})
      .expect(201);
    expect(cancelled.body.status).toBe(ResponsibilityStatus.CANCELLED);
    expect(cancelled.body.events.at(-1).type).toBe(ResponsibilityEventType.CANCELLED);

    const replay = await request(app.getHttpServer())
      .post(url(`/${created.body.id}/cancel`))
      .set(auth('admin'))
      .send({})
      .expect(201);
    expect(replay.body.events).toHaveLength(cancelled.body.events.length);

    await request(app.getHttpServer())
      .post(url(`/${created.body.id}/resume`))
      .set(auth('admin'))
      .send({})
      .expect(409);
    await request(app.getHttpServer())
      .post(url(`/${created.body.id}/complete`))
      .set(auth('admin'))
      .send({ confirmed: true })
      .expect(409);
  });

  it('rejects caller attempts to choose server-owned boundaries and rejects secret-like metadata', async () => {
    await request(app.getHttpServer())
      .post(url())
      .set(auth('owner'))
      .send({
        ...createBody(),
        principalOrganizationId: otherOrgId,
        contextType: 'PERSONAL',
        privacyScope: 'SHARED_TRANSACTION',
        status: 'COMPLETED',
        evidenceLevel: 'VERIFIED',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(url())
      .set(auth('owner'))
      .send({ ...createBody(), promise: 'Use api_key=do-not-store-this to finish the work' })
      .expect(400);
  });

  it('keeps Personal Responsibility routes Personal-only', async () => {
    const created = await request(app.getHttpServer())
      .post(url())
      .set(auth('owner'))
      .send(createBody())
      .expect(201);

    const personal = await request(app.getHttpServer())
      .get('/responsibilities')
      .set(auth('owner'))
      .expect(200);
    expect(personal.body.some((row: { id: string }) => row.id === created.body.id)).toBe(false);
  });
});
