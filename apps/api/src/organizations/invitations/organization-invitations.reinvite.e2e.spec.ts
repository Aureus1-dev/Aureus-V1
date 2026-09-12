import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { OrganizationInvitationStatus, OrganizationMemberRole, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { PrismaService } from '../../prisma/prisma.service';

describe('Organization invitation expiration and re-invite — Step 1', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  const marker = randomUUID();
  const ownerEmail = `reinvite-owner-${marker}@example.test`;
  let ownerId: string;
  let ownerToken: string;
  let orgId: string;

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
    ownerToken = jwt.sign({
      sub: ownerId,
      email: ownerEmail,
      roles: [UserRole.BUSINESS_REPRESENTATIVE],
    });

    const org = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `E2E-REINVITE-${marker}`,
        shortDescription: 'Invitation lifecycle test',
        fullDescription: 'A full description for expired invitation re-invite coverage.',
        organizationType: 'BUSINESS',
        websiteUrl: 'https://example.test',
      })
      .expect(201);
    orgId = org.body.id;
  });

  afterAll(async () => {
    await prisma.db.organization.deleteMany({ where: { id: orgId } });
    await prisma.db.user.deleteMany({ where: { id: ownerId } });
    await app.close();
  });

  async function seedExpiredPending(email: string): Promise<string> {
    const row = await prisma.db.organizationInvitation.create({
      data: {
        organizationId: orgId,
        invitedEmail: email,
        role: OrganizationMemberRole.MEMBER,
        status: OrganizationInvitationStatus.PENDING,
        invitedById: ownerId,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    return row.id;
  }

  it('retires an untouched expired PENDING invitation and creates a fresh PENDING invitation', async () => {
    const email = `Expired-${marker}@Example.Test`;
    const oldId = await seedExpiredPending(email);

    const fresh = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: email.toLowerCase(), role: 'MEMBER' })
      .expect(201);

    expect(fresh.body.status).toBe('PENDING');
    expect(fresh.body.id).not.toBe(oldId);

    const rows = await prisma.db.organizationInvitation.findMany({
      where: { organizationId: orgId, invitedEmail: { equals: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === oldId)?.status).toBe(OrganizationInvitationStatus.EXPIRED);
    expect(rows.find((row) => row.id === fresh.body.id)?.status).toBe(
      OrganizationInvitationStatus.PENDING,
    );
  });

  it('keeps exactly one fresh PENDING invitation when two re-invites race after expiration', async () => {
    const email = `race-${marker}@example.test`;
    const oldId = await seedExpiredPending(email.toUpperCase());

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email }),
      request(app.getHttpServer())
        .post(`/organizations/${orgId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: email.toUpperCase() }),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);

    const rows = await prisma.db.organizationInvitation.findMany({
      where: { organizationId: orgId, invitedEmail: { equals: email, mode: 'insensitive' } },
    });
    expect(rows.find((row) => row.id === oldId)?.status).toBe(OrganizationInvitationStatus.EXPIRED);
    expect(rows.filter((row) => row.status === OrganizationInvitationStatus.PENDING)).toHaveLength(1);
  });
});
