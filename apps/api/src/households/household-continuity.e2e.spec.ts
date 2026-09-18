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
  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;
  let householdId: string;
  let archivedHouseholdId: string;
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
    const owner = await prisma.db.user.create({ data: { email: ownerEmail } });
    const member = await prisma.db.user.create({ data: { email: memberEmail } });
    const outsider = await prisma.db.user.create({ data: { email: outsiderEmail } });
    ownerId = owner.id;
    memberId = member.id;
    outsiderId = outsider.id;
    ownerToken = tokenFor(ownerId, ownerEmail);
    memberToken = tokenFor(memberId, memberEmail);
    outsiderToken = tokenFor(outsiderId, outsiderEmail);

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
      await prisma.db.$executeRawUnsafe(`DELETE FROM "HouseholdEvent" WHERE "actorUserId" IN ('${ownerId}', '${memberId}', '${outsiderId}')`);
      await prisma.db.$executeRawUnsafe(`DELETE FROM "HouseholdResponsibilityParticipant" WHERE "participantUserId" IN ('${ownerId}', '${memberId}', '${outsiderId}') OR "invitedByUserId" IN ('${ownerId}', '${memberId}', '${outsiderId}')`);
      await prisma.db.$executeRawUnsafe(`DELETE FROM "HouseholdDependency" WHERE "dependentUserId" IN ('${ownerId}', '${memberId}', '${outsiderId}') OR "supporterUserId" IN ('${ownerId}', '${memberId}', '${outsiderId}')`);
      await prisma.db.$executeRawUnsafe(`DELETE FROM "HouseholdRelationship" WHERE "subjectUserId" IN ('${ownerId}', '${memberId}', '${outsiderId}') OR "relatedUserId" IN ('${ownerId}', '${memberId}', '${outsiderId}')`);
      await prisma.db.$executeRawUnsafe(`DELETE FROM "HouseholdMembership" WHERE "userId" IN ('${ownerId}', '${memberId}', '${outsiderId}')`);
      if (householdId) await prisma.db.$executeRawUnsafe(`DELETE FROM "Household" WHERE "id" = '${householdId}'`);
      if (archivedHouseholdId) await prisma.db.$executeRawUnsafe(`DELETE FROM "Household" WHERE "id" = '${archivedHouseholdId}'`);
      await prisma.db.responsibility.deleteMany({ where: { id: responsibilityId } });
      await prisma.db.user.deleteMany({ where: { id: { in: [ownerId, memberId, outsiderId] } } });
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

    const householdRows = await prisma.db.$queryRawUnsafe<Array<{ status: string }>>(
      `SELECT "status"::text AS "status" FROM "Household" WHERE "id" = '${archivedHouseholdId}'`,
    );
    const invitationRows = await prisma.db.$queryRawUnsafe<Array<{ status: string }>>(
      `SELECT "status"::text AS "status" FROM "HouseholdMembership" WHERE "id" = '${invited.body.id}'`,
    );
    expect(householdRows[0]?.status).toBe('ARCHIVED');
    expect(invitationRows[0]?.status).toBe('ENDED');
  });
});