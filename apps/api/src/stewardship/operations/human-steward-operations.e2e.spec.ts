import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  ResponsibilityStatus,
  StewardshipRelationshipOrigin,
  StewardshipRelationshipStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { PrismaService } from '../../prisma/prisma.service';

describe('People Step 4 — Human Steward Operations E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  let memberId: string;
  let stewardOneId: string;
  let stewardTwoId: string;
  let unrelatedStewardId: string;
  let adminId: string;
  let fillerMemberId: string;
  let memberConversationId: string;
  let statedNeedId: string;
  let responsibilityId: string;
  let escalationId: string;
  let firstRelationshipId: string;
  let secondRelationshipId: string;
  let fillerRelationshipId: string;

  let stewardOneToken: string;
  let stewardTwoToken: string;
  let unrelatedStewardToken: string;
  let adminToken: string;

  const marker = `people-step4-${randomUUID()}`;
  const tokenFor = (id: string, email: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email, roles });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    const memberEmail = `member-${marker}@example.test`;
    const stewardOneEmail = `steward-one-${marker}@example.test`;
    const stewardTwoEmail = `steward-two-${marker}@example.test`;
    const unrelatedEmail = `unrelated-${marker}@example.test`;
    const adminEmail = `admin-${marker}@example.test`;
    const fillerEmail = `filler-${marker}@example.test`;

    const [member, stewardOne, stewardTwo, unrelated, admin, filler] = await Promise.all([
      prisma.db.user.create({ data: { email: memberEmail } }),
      prisma.db.user.create({ data: { email: stewardOneEmail, roles: [UserRole.MEMBER, UserRole.STEWARD] } }),
      prisma.db.user.create({ data: { email: stewardTwoEmail, roles: [UserRole.MEMBER, UserRole.STEWARD] } }),
      prisma.db.user.create({ data: { email: unrelatedEmail, roles: [UserRole.MEMBER, UserRole.STEWARD] } }),
      prisma.db.user.create({ data: { email: adminEmail, roles: [UserRole.MEMBER, UserRole.PLATFORM_ADMINISTRATOR] } }),
      prisma.db.user.create({ data: { email: fillerEmail } }),
    ]);

    memberId = member.id;
    stewardOneId = stewardOne.id;
    stewardTwoId = stewardTwo.id;
    unrelatedStewardId = unrelated.id;
    adminId = admin.id;
    fillerMemberId = filler.id;

    stewardOneToken = tokenFor(stewardOneId, stewardOneEmail, [UserRole.MEMBER, UserRole.STEWARD]);
    stewardTwoToken = tokenFor(stewardTwoId, stewardTwoEmail, [UserRole.MEMBER, UserRole.STEWARD]);
    unrelatedStewardToken = tokenFor(unrelatedStewardId, unrelatedEmail, [UserRole.MEMBER, UserRole.STEWARD]);
    adminToken = tokenFor(adminId, adminEmail, [UserRole.MEMBER, UserRole.PLATFORM_ADMINISTRATOR]);
    const memberToken = tokenFor(memberId, memberEmail, [UserRole.MEMBER]);

    const conversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'People Step 4 source conversation' })
      .expect(201);
    memberConversationId = conversation.body.id;

    const need = await prisma.db.statedNeed.create({
      data: {
        userId: memberId,
        conversationId: memberConversationId,
        content: 'My housing is under pressure and I want a Human Steward to help coordinate the next step.',
      },
    });
    statedNeedId = need.id;

    const responsibility = await prisma.db.responsibility.create({
      data: {
        kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
        objective: 'Private objective that must never appear in the Human Steward queue',
        contextType: ResponsibilityContextType.PERSONAL,
        principalUserId: memberId,
        originConversationId: memberConversationId,
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          statedNeedId,
          completionRule: 'SOURCE_DOMAIN_OUTCOME_EVIDENCE_REQUIRED',
        },
        authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
        authorityPolicyVersion: 'people-step4-test',
        privacyScope: ResponsibilityPrivacyScope.PERSONAL_PRIVATE,
        privacyPolicyVersion: 'people-step4-test',
      },
    });
    responsibilityId = responsibility.id;

    const escalation = await prisma.db.needEscalation.create({
      data: {
        userId: memberId,
        statedNeedId,
        reason: 'Please bring in a person for judgment and coordination.',
      },
    });
    escalationId = escalation.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.db.stewardshipEscalation.deleteMany({
        where: { raisedById: { in: [stewardOneId, stewardTwoId, adminId] } },
      });
      await prisma.db.needEscalation.deleteMany({ where: { userId: memberId } });
      await prisma.db.stewardshipRelationship.deleteMany({
        where: { memberId: { in: [memberId, fillerMemberId] } },
      });
      await prisma.db.stewardCapacity.deleteMany({
        where: { stewardId: { in: [stewardOneId, stewardTwoId, unrelatedStewardId] } },
      });
      await prisma.db.responsibility.deleteMany({ where: { principalUserId: memberId } });
      await prisma.db.statedNeed.deleteMany({ where: { userId: memberId } });
      await prisma.db.user.deleteMany({
        where: {
          id: {
            in: [memberId, stewardOneId, stewardTwoId, unrelatedStewardId, adminId, fillerMemberId],
          },
        },
      });
      await app.close();
    }
  });

  it('shows unassigned work to administrators with canonical Responsibility linkage but no private payload', async () => {
    const response = await request(app.getHttpServer())
      .get('/people/steward-operations/queue')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const item = response.body.find((row: { escalationId: string }) => row.escalationId === escalationId);
    expect(item).toMatchObject({
      escalationId,
      memberId,
      statedNeedId,
      responsibilityId,
      responsibilityLinkState: 'LINKED',
      ownershipState: 'UNASSIGNED',
      authorityBoundary: 'ASSIGNMENT_DOES_NOT_GRANT_PRIVATE_DATA_OR_ACTION_AUTHORITY',
    });
    const serialized = JSON.stringify(item);
    expect(serialized).not.toContain('Private objective');
    expect(serialized).not.toContain(memberConversationId);
    expect(serialized).not.toContain('evidence');
  });

  it('gives an unrelated steward an opaque boundary before assignment', async () => {
    const queue = await request(app.getHttpServer())
      .get('/people/steward-operations/queue')
      .set('Authorization', `Bearer ${unrelatedStewardToken}`)
      .expect(200);
    expect(queue.body.some((row: { escalationId: string }) => row.escalationId === escalationId)).toBe(false);

    await request(app.getHttpServer())
      .get(`/people/steward-operations/requests/${escalationId}`)
      .set('Authorization', `Bearer ${unrelatedStewardToken}`)
      .expect(404);
  });

  it('assigns through the existing Stewardship relationship and restricts queue visibility to the current steward', async () => {
    const assigned = await request(app.getHttpServer())
      .post(`/people/steward-operations/requests/${escalationId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stewardId: stewardOneId })
      .expect(201);

    expect(assigned.body.ownershipState).toBe('ASSIGNED');
    expect(assigned.body.assignedStewardId).toBe(stewardOneId);
    firstRelationshipId = assigned.body.relationshipId;

    const ownQueue = await request(app.getHttpServer())
      .get('/people/steward-operations/queue')
      .set('Authorization', `Bearer ${stewardOneToken}`)
      .expect(200);
    expect(ownQueue.body.some((row: { escalationId: string }) => row.escalationId === escalationId)).toBe(true);

    const otherQueue = await request(app.getHttpServer())
      .get('/people/steward-operations/queue')
      .set('Authorization', `Bearer ${stewardTwoToken}`)
      .expect(200);
    expect(otherQueue.body.some((row: { escalationId: string }) => row.escalationId === escalationId)).toBe(false);
  });

  it('lets the current steward acknowledge and records T2 triage without creating authority', async () => {
    const authorityBefore = await prisma.db.authorityGrant.count({ where: { subjectUserId: memberId } });

    const acknowledged = await request(app.getHttpServer())
      .post(`/people/steward-operations/requests/${escalationId}/acknowledge`)
      .set('Authorization', `Bearer ${stewardOneToken}`)
      .send({})
      .expect(201);
    expect(acknowledged.body.status).toBe('ACKNOWLEDGED');
    expect(acknowledged.body.acknowledgedById).toBe(stewardOneId);

    const triaged = await request(app.getHttpServer())
      .post(`/people/steward-operations/requests/${escalationId}/triage`)
      .set('Authorization', `Bearer ${stewardOneToken}`)
      .send({ level: 'T2_FOUNDATION_RISK', reason: 'Housing foundation may fail soon; prioritize human follow-through.' })
      .expect(201);
    expect(triaged.body.triageLevel).toBe('T2_FOUNDATION_RISK');
    expect(triaged.body.triageSeverity).toBe('HIGH');

    const triageRecord = await prisma.db.stewardshipEscalation.findFirst({
      where: {
        relationshipId: firstRelationshipId,
        title: { startsWith: `PEOPLE_STEP4_TRIAGE:${escalationId}:` },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(triageRecord?.severity).toBe('HIGH');
    expect(triageRecord?.raisedById).toBe(stewardOneId);

    const authorityAfter = await prisma.db.authorityGrant.count({ where: { subjectUserId: memberId } });
    expect(authorityAfter).toBe(authorityBefore);
  });

  it('keeps the current steward owner when handoff is requested and target capacity preflight fails', async () => {
    await request(app.getHttpServer())
      .post(`/people/steward-operations/requests/${escalationId}/handoff-request`)
      .set('Authorization', `Bearer ${stewardOneToken}`)
      .send({ reason: 'This needs a different Human Steward specialty.' })
      .expect(201);

    const stillOwned = await prisma.db.stewardshipRelationship.findUnique({ where: { id: firstRelationshipId } });
    expect(stillOwned?.status).toBe(StewardshipRelationshipStatus.ACTIVE);
    expect(stillOwned?.stewardId).toBe(stewardOneId);

    const filler = await prisma.db.stewardshipRelationship.create({
      data: {
        memberId: fillerMemberId,
        stewardId: stewardTwoId,
        status: StewardshipRelationshipStatus.ACTIVE,
        origin: StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT,
        assignedById: adminId,
        activatedAt: new Date(),
      },
    });
    fillerRelationshipId = filler.id;
    await prisma.db.stewardCapacity.upsert({
      where: { stewardId: stewardTwoId },
      update: { maxActiveMembers: 1, updatedById: adminId },
      create: { stewardId: stewardTwoId, maxActiveMembers: 1, updatedById: adminId },
    });

    await request(app.getHttpServer())
      .post(`/people/steward-operations/requests/${escalationId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stewardId: stewardTwoId })
      .expect(409);

    const afterFailure = await prisma.db.stewardshipRelationship.findUnique({ where: { id: firstRelationshipId } });
    expect(afterFailure?.status).toBe(StewardshipRelationshipStatus.ACTIVE);
    expect(afterFailure?.stewardId).toBe(stewardOneId);
  });

  it('completes supervised handoff, preserves old relationship history, and transfers queue visibility', async () => {
    await prisma.db.stewardCapacity.update({
      where: { stewardId: stewardTwoId },
      data: { maxActiveMembers: 2, updatedById: adminId },
    });

    const handedOff = await request(app.getHttpServer())
      .post(`/people/steward-operations/requests/${escalationId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stewardId: stewardTwoId })
      .expect(201);

    expect(handedOff.body.assignedStewardId).toBe(stewardTwoId);
    secondRelationshipId = handedOff.body.relationshipId;
    expect(secondRelationshipId).not.toBe(firstRelationshipId);

    const oldRelationship = await prisma.db.stewardshipRelationship.findUnique({ where: { id: firstRelationshipId } });
    expect(oldRelationship?.status).toBe(StewardshipRelationshipStatus.ENDED);
    const newRelationship = await prisma.db.stewardshipRelationship.findUnique({ where: { id: secondRelationshipId } });
    expect(newRelationship?.status).toBe(StewardshipRelationshipStatus.ACTIVE);
    expect(newRelationship?.stewardId).toBe(stewardTwoId);

    await request(app.getHttpServer())
      .get(`/people/steward-operations/requests/${escalationId}`)
      .set('Authorization', `Bearer ${stewardOneToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/people/steward-operations/requests/${escalationId}`)
      .set('Authorization', `Bearer ${stewardTwoToken}`)
      .expect(200);
  });

  it('resolves only the Human Steward step and leaves the underlying Responsibility unresolved', async () => {
    const resolved = await request(app.getHttpServer())
      .post(`/people/steward-operations/requests/${escalationId}/resolve`)
      .set('Authorization', `Bearer ${stewardTwoToken}`)
      .send({ resolutionNotes: 'Human coordination step finished; underlying member outcome still needs confirmation.' })
      .expect(201);

    expect(resolved.body.status).toBe('RESOLVED');
    const responsibility = await prisma.db.responsibility.findUnique({ where: { id: responsibilityId } });
    expect(responsibility?.status).toBe(ResponsibilityStatus.ACTIVE);
  });
});
