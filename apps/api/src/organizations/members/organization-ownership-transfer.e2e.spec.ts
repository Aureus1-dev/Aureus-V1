import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { OrganizationMemberRole, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { PrismaService } from '../../prisma/prisma.service';

describe('Organization ownership transfer — Step 1 boundary', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  const marker = randomUUID();
  const ownerEmail = `owner-transfer-${marker}@example.test`;
  const targetEmail = `target-transfer-${marker}@example.test`;
  let ownerId: string;
  let targetId: string;
  let ownerToken: string;
  let orgId: string;

  const tokenFor = (id: string, email: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email, roles });

  async function createBusiness(name: string): Promise<string> {
    const org = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name,
        shortDescription: 'Ownership boundary test',
        fullDescription: 'A full description for the Step 1 ownership-transfer boundary test.',
        organizationType: 'BUSINESS',
        websiteUrl: 'https://example.test',
      })
      .expect(201);
    return org.body.id;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    const owner = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: ownerEmail, password: 'Str0ng!Passw0rd' })
      .expect(201);
    ownerId = owner.body.user.id;
    ownerToken = tokenFor(ownerId, ownerEmail, [UserRole.BUSINESS_REPRESENTATIVE]);

    const target = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: targetEmail, password: 'Str0ng!Passw0rd' })
      .expect(201);
    targetId = target.body.user.id;

    orgId = await createBusiness(`E2E-OWNER-TRANSFER-${marker}`);

    await prisma.db.organizationMember.create({
      data: { organizationId: orgId, userId: targetId, role: OrganizationMemberRole.MEMBER },
    });
  });

  afterAll(async () => {
    await prisma.db.organization.deleteMany({ where: { name: { contains: marker } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: marker } } });
    await app.close();
  });

  it('does not let a non-member platform Steward substitute for the actual OWNER', async () => {
    const stewardToken = tokenFor(randomUUID(), `steward-${marker}@example.test`, [UserRole.STEWARD]);

    await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/members/ownership/transfer`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ newOwnerUserId: targetId })
      .expect(403);
  });

  it('does not let a non-member platform Administrator substitute for the actual OWNER', async () => {
    const adminToken = tokenFor(randomUUID(), `admin-${marker}@example.test`, [
      UserRole.PLATFORM_ADMINISTRATOR,
    ]);

    await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/members/ownership/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newOwnerUserId: targetId })
      .expect(403);
  });

  it('lets the current OWNER transfer and finishes with exactly one OWNER', async () => {
    const transferred = await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/members/ownership/transfer`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ newOwnerUserId: targetId })
      .expect(200);

    expect(transferred.body).toMatchObject({ userId: targetId, role: 'OWNER' });

    const members = await prisma.db.organizationMember.findMany({
      where: { organizationId: orgId },
      orderBy: { userId: 'asc' },
    });
    expect(members.filter((member) => member.role === OrganizationMemberRole.OWNER)).toHaveLength(1);
    expect(members.find((member) => member.userId === targetId)?.role).toBe(
      OrganizationMemberRole.OWNER,
    );
    expect(members.find((member) => member.userId === ownerId)?.role).toBe(
      OrganizationMemberRole.ADMIN,
    );
  });

  it('serializes two simultaneous transfers so stale OWNER authority cannot succeed twice', async () => {
    const secondTargetEmail = `target2-transfer-${marker}@example.test`;
    const secondTarget = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: secondTargetEmail, password: 'Str0ng!Passw0rd' })
      .expect(201);
    const secondTargetId = secondTarget.body.user.id;

    const raceOrgId = await createBusiness(`E2E-OWNER-TRANSFER-RACE-${marker}`);
    await prisma.db.organizationMember.createMany({
      data: [
        { organizationId: raceOrgId, userId: targetId, role: OrganizationMemberRole.MEMBER },
        { organizationId: raceOrgId, userId: secondTargetId, role: OrganizationMemberRole.MEMBER },
      ],
    });

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/organizations/${raceOrgId}/members/ownership/transfer`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerUserId: targetId }),
      request(app.getHttpServer())
        .patch(`/organizations/${raceOrgId}/members/ownership/transfer`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newOwnerUserId: secondTargetId }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 403]);

    const members = await prisma.db.organizationMember.findMany({
      where: { organizationId: raceOrgId },
    });
    expect(members.filter((member) => member.role === OrganizationMemberRole.OWNER)).toHaveLength(1);
    expect(members.find((member) => member.userId === ownerId)?.role).toBe(
      OrganizationMemberRole.ADMIN,
    );
  });
});
