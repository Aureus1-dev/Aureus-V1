import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

describe('People Step 3 — Household & Relationship Continuity E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  let ownerId: string;
  let memberId: string;
  let outsiderId: string;
  let thirdMemberId: string;
  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;
  let thirdMemberToken: string;
  let householdId: string;
  let archivedHouseholdId: string;
  let concurrentHouseholdId: string;
  let membershipId: string;
  let responsibilityId: string;

  const marker = 'people-step3-' + randomUUID();
  const tokenFor = (id: string, email: string): string => jwt.sign({ sub: id, email, roles: [UserRole.MEMBER] });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    const ownerEmail = `owner-${marker}@example.test`;
    const memberEmail = `member-${marker}@example.test`;
    const outsiderEmail = `outsider-${marker}@example.test`;
    const thirdMemberEmail = `third-${marker}@example.test`;
    const owner = await prisma.db.user.create({ data: { email: ownerEmail } });
    const member = await prisma.db.user.create({ data: { email: memberEmail } });
    const outsider = await prisma.db.user.create({ data: { email: outsiderEmail } });
    const thirdMember = await prisma.db.user.create({ data: { email: thirdMemberEmail } });
    ownerId = owner.id;
    memberId = member.id;
    outsiderId = outsider.id;
    thirdMemberId = thirdMember.id;
    ownerToken = tokenFor(ownerId, ownerEmail);
    memberToken = tokenFor(memberId, memberEmail);
    outsiderToken = tokenFor(outsiderId, outsiderEmail);
    thirdMemberToken = tokenFor(thirdMemberId, thirdMemberEmail);

    const responsibility = await prisma.db.responsibility.create({
      data: {
        kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
        objective: 'Coordinate a household task without leaking the underlying case',
        contextType: ResponsibilityContextType.PERSONAL,
        principalUserId: ownerId,
        originConversationId: randomUUID(),
        successCriteria: { type: 'MEMBER_REPORTED_RESOLUTION' },
        authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
        authorityPolicyVersion: 'people-step3-test',
        privacyScope: ResponsibilityPrivacyScope.PERSONAL_PRIVATE,
        privacyPolicyVersion: 'people-step3-test',
      },
    });
    responsibilityId = responsibility.id;
  });

  afterAll(async () => {
    if (prisma) {
      const householdIds = [householdId, archivedHouseholdId, concurrentHouseholdId].filter(
        (id): id is string => Boolean(id),
      );
      if (householdIds.length > 0) {
        await prisma.db.householdEvent.deleteMany({ where: { householdId: { in: householdIds } } });
        await prisma.db.householdResponsibilityParticipant.deleteMany({ where: { householdId: { in: householdIds } } });
        await prisma.db.householdDependency.deleteMany({ where: { householdId: { in: householdIds } } });
        await prisma.db.householdRelationship.deleteMany({ where: { householdId: { in: householdIds } } });
        await prisma.db.householdMembership.deleteMany({ where: { householdId: { in: householdIds } } });
        await prisma.db.household.deleteMany({ where: { id: { in: householdIds } } });
      }
      await prisma.db.responsibility.deleteMany({ where: { id: responsibilityId } });
      await prisma.db.user.deleteMany({ where: { id: { in: [ownerId, memberId, outsiderId, thirdMemberId] } } });
      await app.close();
    }
  });

  it('creates one household with only the creator active and exposes no private member payloads', async () => {
    const response = await request(app.getHttpServer())
      .post('/people/households')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ label: 'Home' })
      .expect(201);

    householdId = response.body.id;
    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0].userId).toBe(ownerId);
    expect(response.body.privacyBoundary).toBe('HOUSEHOLD_MEMBERSHIP_DOES_NOT_GRANT_PRIVATE_DATA_OR_ACTION_AUTHORITY');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('email');
  });

  it('returns not-found boundaries to a nonmember', async () => {
    await request(app.getHttpServer())
      .get(`/people/households/${householdId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);
  });

  it('requires invitation acceptance before another adult becomes a household member', async () => {
    const invited = await request(app.getHttpServer())
      .post(`/people/households/${householdId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: memberId })
      .expect(201);
    membershipId = invited.body.id;

    await request(app.getHttpServer())
      .get(`/people/households/${householdId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(404);

    const accepted = await request(app.getHttpServer())
      .post(`/people/households/${householdId}/invitations/${membershipId}/respond`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ accept: true })
      .expect(201);
    expect(accepted.body.members.map((m: { userId: string }) => m.userId).sort()).toEqual([memberId, ownerId].sort());
  });

  it('requires the other adult to confirm a relationship and never treats it as blanket authority', async () => {
    const proposed = await request(app.getHttpServer())
      .post(`/people/households/${householdId}/relationships`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ otherUserId: memberId, type: 'SPOUSE_OR_PARTNER' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/people/households/${householdId}/relationships/${proposed.body.id}/respond`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ accept: true })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/people/households/${householdId}/relationships/${proposed.body.id}/respond`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ accept: true })
      .expect(201);

    // A confirmed household relationship does not turn another adult's private
    // Personal Responsibility into caller-owned data.
    await request(app.getHttpServer())
      .get(`/responsibilities/${responsibilityId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(404);
  });

  it('requires bilateral confirmation for dependencies', async () => {
    const proposed = await request(app.getHttpServer())
      .post(`/people/households/${householdId}/dependencies`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ otherUserId: memberId, direction: 'I_SUPPORT_THEM', kind: 'CARE' })
      .expect(201);
    expect(proposed.body.supporterUserId).toBe(ownerId);
    expect(proposed.body.dependentUserId).toBe(memberId);

    const accepted = await request(app.getHttpServer())
      .post(`/people/households/${householdId}/dependencies/${proposed.body.id}/respond`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ accept: true })
      .expect(201);
    expect(accepted.body.status).toBe('ACTIVE');
  });

  it('does not expose another active pair relationship or dependency to a third confirmed household member', async () => {
    const invited = await request(app.getHttpServer())
      .post(`/people/households/${householdId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: thirdMemberId })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/people/households/${householdId}/invitations/${invited.body.id}/respond`)
      .set('Authorization', `Bearer ${thirdMemberToken}`)
      .send({ accept: true })
      .expect(201);

    const state = await request(app.getHttpServer())
      .get(`/people/households/${householdId}`)
      .set('Authorization', `Bearer ${thirdMemberToken}`)
      .expect(200);

    expect(state.body.members.map((m: { userId: string }) => m.userId).sort()).toEqual(
      [ownerId, memberId, thirdMemberId].sort(),
    );
    expect(state.body.relationships).toEqual([]);
    expect(state.body.dependencies).toEqual([]);
  });

  it('shares coordination on an exact owner Responsibility without sharing its private payload', async () => {
    const share = await request(app.getHttpServer())
      .post(`/people/households/${householdId}/responsibilities`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ responsibilityId, participantUserId: memberId })
      .expect(201);
    expect(share.body.dataAuthorityGranted).toBe(false);

    await request(app.getHttpServer())
      .post(`/people/households/${householdId}/responsibilities/${share.body.id}/respond`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ accept: true })
      .expect(404);

    const accepted = await request(app.getHttpServer())
      .post(`/people/households/${householdId}/responsibilities/${share.body.id}/respond`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ accept: true })
      .expect(201);
    expect(accepted.body.status).toBe('ACTIVE');
    expect(accepted.body.dataAuthorityGranted).toBe(false);

    const state = await request(app.getHttpServer())
      .get(`/people/households/${householdId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const encoded = JSON.stringify(state.body.sharedResponsibilities);
    expect(encoded).toContain(responsibilityId);
    expect(encoded).not.toContain('Coordinate a household task');
  });

  it('does not let one household member share a Responsibility owned by someone else', async () => {
    await request(app.getHttpServer())
      .post(`/people/households/${householdId}/responsibilities`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ responsibilityId, participantUserId: ownerId })
      .expect(404);
  });

  it('ends caller household coordination edges when they leave', async () => {
    await request(app.getHttpServer())
      .post(`/people/households/${householdId}/leave`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .get(`/people/households/${householdId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(404);
  });

  it('serializes simultaneous final departures so an empty household is archived', async () => {
    const created = await request(app.getHttpServer())
      .post('/people/households')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ label: 'Concurrent Leave Test' })
      .expect(201);
    concurrentHouseholdId = created.body.id;

    const invited = await request(app.getHttpServer())
      .post(`/people/households/${concurrentHouseholdId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: thirdMemberId })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/people/households/${concurrentHouseholdId}/invitations/${invited.body.id}/respond`)
      .set('Authorization', `Bearer ${thirdMemberToken}`)
      .send({ accept: true })
      .expect(201);

    await Promise.all([
      request(app.getHttpServer())
        .post(`/people/households/${concurrentHouseholdId}/leave`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(201),
      request(app.getHttpServer())
        .post(`/people/households/${concurrentHouseholdId}/leave`)
        .set('Authorization', `Bearer ${thirdMemberToken}`)
        .send({})
        .expect(201),
    ]);

    const household = await prisma.db.household.findUnique({
      where: { id: concurrentHouseholdId },
      select: { status: true },
    });
    const activeMemberships = await prisma.db.householdMembership.count({
      where: { householdId: concurrentHouseholdId, status: 'ACTIVE' },
    });
    expect(household?.status).toBe('ARCHIVED');
    expect(activeMemberships).toBe(0);
  });

  it('archives a household when the last active member leaves and invalidates pending invitations', async () => {
    const created = await request(app.getHttpServer())
      .post('/people/households')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ label: 'Archive Test' })
      .expect(201);
    archivedHouseholdId = created.body.id;

    const invited = await request(app.getHttpServer())
      .post(`/people/households/${archivedHouseholdId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: outsiderId })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/people/households/${archivedHouseholdId}/leave`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/people/households/${archivedHouseholdId}/invitations/${invited.body.id}/respond`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ accept: true })
      .expect(404);

    const household = await prisma.db.household.findUnique({
      where: { id: archivedHouseholdId },
      select: { status: true },
    });
    const invitation = await prisma.db.householdMembership.findUnique({
      where: { id: invited.body.id },
      select: { status: true },
    });
    expect(household?.status).toBe('ARCHIVED');
    expect(invitation?.status).toBe('ENDED');
  });
});