import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import {
  CitySheetCategory,
  CitySheetEntryStatus,
  CitySheetVerificationStatus,
  LegalActionType,
  LegalMatterProvenance,
  LegalMatterRetentionState,
  LegalMatterSourceKind,
  LegalMatterSourceVerification,
  LegalMatterUrgency,
  ResponsibilityStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

describe('PEOPLE-LEGAL-001 Matter Stewardship E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  let ownerId: string;
  let otherId: string;
  let stewardId: string;
  let adminId: string;
  let ownerToken: string;
  let otherToken: string;
  let stewardToken: string;
  let adminToken: string;
  let conversationId: string;
  let statedNeedId: string;
  let matterId: string;
  let sourceId: string;
  let legalAidId: string;

  const marker = 'people-legal-' + randomUUID();
  const tokenFor = (id: string, email: string, roles: UserRole[]) =>
    jwt.sign({ sub: id, email, roles });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    const ownerEmail = `owner-${marker}@example.test`;
    const otherEmail = `other-${marker}@example.test`;
    const stewardEmail = `steward-${marker}@example.test`;
    const adminEmail = `admin-${marker}@example.test`;
    const owner = await prisma.db.user.create({ data: { email: ownerEmail } });
    const other = await prisma.db.user.create({ data: { email: otherEmail } });
    const steward = await prisma.db.user.create({ data: { email: stewardEmail, roles: [UserRole.STEWARD] } });
    const admin = await prisma.db.user.create({
      data: { email: adminEmail, roles: [UserRole.PLATFORM_ADMINISTRATOR] },
    });
    ownerId = owner.id;
    otherId = other.id;
    stewardId = steward.id;
    adminId = admin.id;
    ownerToken = tokenFor(ownerId, ownerEmail, [UserRole.MEMBER]);
    otherToken = tokenFor(otherId, otherEmail, [UserRole.MEMBER]);
    stewardToken = tokenFor(stewardId, stewardEmail, [UserRole.STEWARD]);
    adminToken = tokenFor(adminId, adminEmail, [UserRole.PLATFORM_ADMINISTRATOR]);

    const conversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Legal matter conversation' })
      .expect(201);
    conversationId = conversation.body.id;

    const need = await prisma.db.statedNeed.create({
      data: {
        userId: ownerId,
        conversationId,
        content: 'I received an eviction complaint and need help keeping track of what happens next.',
      },
    });
    statedNeedId = need.id;

    const legalAid = await prisma.db.citySheetEntry.create({
      data: {
        organizationName: 'Verified Legal Aid Test Route',
        category: CitySheetCategory.LEGAL_AID,
        description: 'A verified test legal-aid route for the Matter Stewardship slice.',
        serviceArea: 'Philadelphia, Pennsylvania',
        hours: 'Weekdays',
        website: 'https://example.test/legal-aid',
        verificationStatus: CitySheetVerificationStatus.VERIFIED,
        lastVerifiedAt: new Date(),
        verifiedById: stewardId,
        status: CitySheetEntryStatus.ACTIVE,
        createdById: stewardId,
        isTestFixture: true,
      },
    });
    legalAidId = legalAid.id;
  });

  afterAll(async () => {
    if (legalAidId) {
      await prisma.db.citySheetEntry.deleteMany({ where: { id: legalAidId } });
    }
    if (ownerId) {
      await prisma.db.legalMatter.deleteMany({ where: { userId: ownerId } });
      await prisma.db.responsibility.deleteMany({ where: { principalUserId: ownerId } });
      await prisma.db.statedNeed.deleteMany({ where: { userId: ownerId } });
    }
    await prisma.db.user.deleteMany({
      where: { id: { in: [ownerId, otherId, stewardId, adminId].filter(Boolean) } },
    });
    await app.close();
  });

  it('requires the member-facing steward-not-lawyer disclosure before Matter creation', async () => {
    await request(app.getHttpServer())
      .post('/people/legal-matters')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        statedNeedId,
        objective: 'Help me carry this legal matter',
        jurisdiction: 'Pennsylvania',
        matterType: 'housing / eviction',
        proceduralPosture: 'complaint received',
        urgency: LegalMatterUrgency.TIME_SENSITIVE,
        disclosureAccepted: false,
      })
      .expect(400);
  });

  it('opens one private Matter on the canonical Personal Responsibility in safe mode', async () => {
    const response = await request(app.getHttpServer())
      .post('/people/legal-matters')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        statedNeedId,
        objective: 'Help me carry this eviction matter without missing what happens next',
        jurisdiction: 'Pennsylvania',
        forum: 'Philadelphia Municipal Court',
        matterType: 'housing / eviction',
        proceduralPosture: 'complaint received; hearing not yet held',
        urgency: LegalMatterUrgency.TIME_SENSITIVE,
        disclosureAccepted: true,
        knownDeadline: '2026-09-25T09:00:00-04:00',
        knownDeadlineTimeZone: 'America/New_York',
        knownDeadlineTrigger: 'Date printed on the complaint',
      })
      .expect(201);

    matterId = response.body.id;
    expect(response.body.assistanceMode).toBe('SAFE_MODE');
    expect(response.body.jurisdictionGate.status).toBe('SAFE_MODE_ONLY');
    expect(response.body.disclosureAcknowledgedAt).toBeTruthy();
    expect(response.body.responsibility.kind).toBe('PERSONAL_NEED_RESOLUTION');
    expect(response.body.deadlines[0].status).toBe('REPORTED');
    expect(response.body.retention.state).toBe(LegalMatterRetentionState.ACTIVE);
    expect(response.body.responsibility.status).not.toBe(ResponsibilityStatus.COMPLETED);
    expect(response.body.representationRouting.publicDefenderAutomaticallyAssumed).toBe(false);
    expect(response.body.legalAidResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: legalAidId,
          organizationName: 'Verified Legal Aid Test Route',
          verificationStatus: CitySheetVerificationStatus.VERIFIED,
        }),
      ]),
    );
  });

  it('is tenant-isolated and does not expose the Matter to another member', async () => {
    await request(app.getHttpServer())
      .get(`/people/legal-matters/${matterId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('keeps member facts and sources REPORTED instead of silently upgrading them', async () => {
    const source = await request(app.getHttpServer())
      .post(`/people/legal-matters/${matterId}/sources`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Court case information page',
        url: 'https://www.courts.phila.gov/',
        kind: LegalMatterSourceKind.OFFICIAL_PROCEDURE,
        jurisdiction: 'Pennsylvania / Philadelphia',
        proposition: 'Member believes this is the official court source for procedure.',
      })
      .expect(201);
    sourceId = source.body.id;
    expect(source.body.verification).toBe(LegalMatterSourceVerification.MEMBER_REPORTED);
    expect(source.body.provenance).toBe(LegalMatterProvenance.REPORTED);

    const fact = await request(app.getHttpServer())
      .post(`/people/legal-matters/${matterId}/facts`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ statement: 'The complaint says a hearing is scheduled.' })
      .expect(201);
    expect(fact.body.provenance).toBe(LegalMatterProvenance.REPORTED);
  });

  it('does not expose raw Legal Matter content through the stewardship-learning projection', async () => {
    const privateMarker = `raw-legal-private-${marker}`;
    await request(app.getHttpServer())
      .post(`/people/legal-matters/${matterId}/facts`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ statement: privateMarker })
      .expect(201);

    const candidates = await request(app.getHttpServer())
      .get('/stewardship-learning/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(JSON.stringify(candidates.body)).not.toContain(privateMarker);
  });

  it('rejects binding a source from a different Matter to this Matter deadline', async () => {
    const secondConversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Second legal matter conversation' })
      .expect(201);
    const secondNeed = await prisma.db.statedNeed.create({
      data: {
        userId: ownerId,
        conversationId: secondConversation.body.id,
        content: 'I have a separate court notice that needs its own legal matter.',
      },
    });

    const secondMatter = await request(app.getHttpServer())
      .post('/people/legal-matters')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        statedNeedId: secondNeed.id,
        objective: 'Carry this separate legal matter',
        jurisdiction: 'Pennsylvania',
        matterType: 'civil / separate matter',
        proceduralPosture: 'notice received',
        urgency: LegalMatterUrgency.ROUTINE,
        disclosureAccepted: true,
      })
      .expect(201);

    const secondSource = await request(app.getHttpServer())
      .post(`/people/legal-matters/${secondMatter.body.id}/sources`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Separate matter source',
        url: 'https://example.test/separate-official-source',
        kind: LegalMatterSourceKind.OFFICIAL_PROCEDURE,
        jurisdiction: 'Pennsylvania',
        proposition: 'A source attached to the separate Matter.',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/people/legal-matters/${matterId}/deadlines`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        label: 'Wrong-matter source must not bind',
        dueAt: '2026-10-01T12:00:00-04:00',
        timeZone: 'America/New_York',
        trigger: 'Cross-Matter binding test',
        sourceId: secondSource.body.id,
      })
      .expect(404);
  });

  it('requires an explicit member review request before an internal source identity check', async () => {
    await request(app.getHttpServer())
      .post(`/internal/legal-matters/${matterId}/sources/${sourceId}/verify-identity`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({})
      .expect(404);

    await request(app.getHttpServer())
      .post(`/people/legal-matters/${matterId}/legal-review`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ purpose: 'Please verify the official source identity before I rely on it.' })
      .expect(201);

    const verified = await request(app.getHttpServer())
      .post(`/internal/legal-matters/${matterId}/sources/${sourceId}/verify-identity`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ note: 'Official source identity checked; no conclusion about applicability.' })
      .expect(201);
    expect(verified.body.verification).toBe(LegalMatterSourceVerification.IDENTITY_VERIFIED);
    expect(verified.body.provenance).toBe(LegalMatterProvenance.REPORTED);

    const observed = await request(app.getHttpServer())
      .post(`/internal/legal-matters/${matterId}/facts/observe`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ sourceId, statement: 'The submitted URL is an official Philadelphia Courts website.' })
      .expect(201);
    expect(observed.body.provenance).toBe(LegalMatterProvenance.OBSERVED);
  });

  it('permits safe surrounding work but gates filing, signing, settlement, testimony, waiver, and representation', async () => {
    const safe = await request(app.getHttpServer())
      .post(`/people/legal-matters/${matterId}/action-check`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ actionType: LegalActionType.PREPARE_QUESTIONS })
      .expect(201);
    expect(safe.body.permitted).toBe(true);

    const gated = await request(app.getHttpServer())
      .post(`/people/legal-matters/${matterId}/action-check`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ actionType: LegalActionType.FILE })
      .expect(201);
    expect(gated.body.permitted).toBe(false);
    expect(gated.body.gate).toBe('HUMAN_LEGAL_GATE_REQUIRED');
  });

  it('does not treat preparation or review as completion; only underlying-need outcome evidence closes the Responsibility', async () => {
    await request(app.getHttpServer())
      .get(`/people/legal-matters/${matterId}/preparation-packet`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const before = await prisma.db.legalMatter.findUniqueOrThrow({
      where: { id: matterId },
      include: { responsibility: true },
    });
    expect(before.responsibility.status).not.toBe(ResponsibilityStatus.COMPLETED);

    const resolved = await request(app.getHttpServer())
      .post(`/people/legal-matters/${matterId}/outcome`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ resolved: true, note: 'The underlying housing dispute is resolved.' })
      .expect(201);

    expect(resolved.body.responsibility.status).toBe(ResponsibilityStatus.COMPLETED);
    expect(resolved.body.retention.state).toBe(LegalMatterRetentionState.REVIEW_REQUIRED);
    expect(resolved.body.retention.reviewAt).toBeTruthy();
    expect(resolved.body.closedAt).toBeTruthy();
  });
});
