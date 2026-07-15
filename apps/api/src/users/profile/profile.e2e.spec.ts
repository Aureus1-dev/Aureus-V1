import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * End-to-end test for the WO-022 self-or-admin authorization retrofit on
 * the Profile sub-resource. Profile.userId carries a real FK to User, so
 * the owner/other-member personas are registered via /auth/register.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('Profile — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  const emailMarker = `e2e-wo022-profile-${randomUUID()}`;
  const adminId = randomUUID();
  const adminToken = () => jwt.sign({ sub: adminId, email: `${adminId}@example.test`, roles: [UserRole.PLATFORM_ADMINISTRATOR] });

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

    jwt = app.get(JwtService);
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
      .post(`/users/${ownerId}/profile`)
      .send({ displayName: 'Alice' })
      .expect(401);
  });

  it('forbids a member from creating another user\'s profile', async () => {
    await request(app.getHttpServer())
      .post(`/users/${ownerId}/profile`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .send({ displayName: 'Hijacked' })
      .expect(403);
  });

  it('allows the owner to create their own profile', async () => {
    const res = await request(app.getHttpServer())
      .post(`/users/${ownerId}/profile`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ displayName: 'Alice Johnson' })
      .expect(201);
    expect(res.body.userId).toBe(ownerId);
  });

  it('forbids a non-owner member from reading the profile', async () => {
    await request(app.getHttpServer())
      .get(`/users/${ownerId}/profile`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .expect(403);
  });

  it('allows the owner to read their own profile', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/${ownerId}/profile`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.displayName).toBe('Alice Johnson');
  });

  it('allows an administrator to read any profile', async () => {
    await request(app.getHttpServer())
      .get(`/users/${ownerId}/profile`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .expect(200);
  });

  it('forbids a non-owner member from updating the profile', async () => {
    await request(app.getHttpServer())
      .patch(`/users/${ownerId}/profile`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .send({ bio: 'Hijacked bio' })
      .expect(403);
  });

  it('allows the owner to update their own profile', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/users/${ownerId}/profile`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bio: 'Software engineer' })
      .expect(200);
    expect(res.body.bio).toBe('Software engineer');
  });

  it('forbids a non-owner member from deleting the profile', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${ownerId}/profile`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .expect(403);
  });

  it('allows the owner to delete their own profile', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${ownerId}/profile`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/users/${ownerId}/profile`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});
