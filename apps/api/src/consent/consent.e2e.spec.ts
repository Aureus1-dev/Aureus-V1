import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';
import { CURRENT_CONSENT_VERSION } from './consent.constants';

/**
 * End-to-end test for B3 (Gate B — The Gate): arrival consent is
 * self-only, append-only, and retrievable later. ConsentRecord.userId
 * carries a real FK to User, so the owner/other-member personas are
 * registered via /auth/register (matching the Profile e2e convention).
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('Consent — E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const emailMarker = `e2e-b3-consent-${randomUUID()}`;

  let ownerId: string;
  let ownerToken: string;
  let otherMemberToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);

    const ownerReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `owner-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    ownerId = ownerReg.body.user.id;
    ownerToken = ownerReg.body.tokens.accessToken;

    const otherReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `other-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    otherMemberToken = otherReg.body.tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer())
      .post(`/users/${ownerId}/consent`)
      .send({ version: CURRENT_CONSENT_VERSION })
      .expect(401);
  });

  it('forbids a caller granting consent for another user', async () => {
    await request(app.getHttpServer())
      .post(`/users/${ownerId}/consent`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .send({ version: CURRENT_CONSENT_VERSION })
      .expect(403);
  });

  it('reports not granted before any consent is recorded', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/${ownerId}/consent`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body).toEqual({ granted: false, isCurrentVersion: false, version: null, grantedAt: null });
  });

  it('allows a member to grant their own consent, and it is retrievable later', async () => {
    const granted = await request(app.getHttpServer())
      .post(`/users/${ownerId}/consent`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ version: CURRENT_CONSENT_VERSION })
      .expect(201);

    expect(granted.body.granted).toBe(true);
    expect(granted.body.isCurrentVersion).toBe(true);
    expect(granted.body.version).toBe(CURRENT_CONSENT_VERSION);
    expect(granted.body.grantedAt).toBeTruthy();

    const status = await request(app.getHttpServer())
      .get(`/users/${ownerId}/consent`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(status.body.granted).toBe(true);
    expect(status.body.version).toBe(CURRENT_CONSENT_VERSION);
  });

  it('forbids a non-owner from reading another user\'s consent status', async () => {
    await request(app.getHttpServer())
      .get(`/users/${ownerId}/consent`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .expect(403);
  });

  it('rejects a grant missing a version', async () => {
    await request(app.getHttpServer())
      .post(`/users/${ownerId}/consent`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(400);
  });
});
