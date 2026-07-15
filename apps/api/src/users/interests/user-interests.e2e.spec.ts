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
 * UserInterest. UserInterest.userId has no FK constraint, so all personas
 * use synthetic minted tokens.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('UserInterests — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  const ownerId = randomUUID();
  const otherMemberId = randomUUID();
  const adminId = randomUUID();

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  let ownerToken: string;
  let otherMemberToken: string;
  let adminToken: string;

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

    ownerToken = tokenFor(ownerId, [UserRole.MEMBER]);
    otherMemberToken = tokenFor(otherMemberId, [UserRole.MEMBER]);
    adminToken = tokenFor(adminId, [UserRole.PLATFORM_ADMINISTRATOR]);
  });

  afterAll(async () => {
    await prisma.db.userInterest.deleteMany({ where: { userId: { in: [ownerId, otherMemberId] } } });
    await app.close();
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer())
      .post(`/users/${ownerId}/interests`)
      .send({ category: 'EDUCATION' })
      .expect(401);
  });

  it('forbids a member from adding an interest for another user', async () => {
    await request(app.getHttpServer())
      .post(`/users/${ownerId}/interests`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .send({ category: 'EDUCATION' })
      .expect(403);
  });

  it('allows the owner to add their own interest', async () => {
    const res = await request(app.getHttpServer())
      .post(`/users/${ownerId}/interests`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ category: 'EDUCATION' })
      .expect(201);
    expect(res.body.userId).toBe(ownerId);
  });

  it('allows an administrator to add an interest for another user', async () => {
    await request(app.getHttpServer())
      .post(`/users/${ownerId}/interests`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: 'SCHOLARSHIP' })
      .expect(201);
  });

  it('forbids a non-owner member from listing another user\'s interests', async () => {
    await request(app.getHttpServer())
      .get(`/users/${ownerId}/interests`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .expect(403);
  });

  it('allows the owner to list their own interests', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/${ownerId}/interests`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('forbids a non-owner member from removing another user\'s interest', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${ownerId}/interests/EDUCATION`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .expect(403);
  });

  it('allows the owner to remove their own interest', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${ownerId}/interests/EDUCATION`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
  });
});
