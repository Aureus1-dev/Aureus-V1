import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

/**
 * End-to-end test for role management (WO-021): boots the full application
 * and exercises grant/revoke through real HTTP requests — real guards, real
 * validation, real PostgreSQL — mirroring the pattern established for
 * Resources (resources.e2e.spec.ts).
 */
describe('Administration — User Roles E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const emailMarker = `e2e-roles-${randomUUID()}`;

  const platformAdminId = randomUUID();
  const systemAdminId = randomUUID();
  const memberTokenId = randomUUID();

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  let platformAdminToken: string;
  let systemAdminToken: string;
  let memberToken: string;
  let targetUserId: string;

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

    platformAdminToken = tokenFor(platformAdminId, [UserRole.PLATFORM_ADMINISTRATOR]);
    systemAdminToken = tokenFor(systemAdminId, [UserRole.SYSTEM_ADMINISTRATOR]);
    memberToken = tokenFor(memberTokenId, [UserRole.MEMBER]);

    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `${emailMarker}@aureus.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    targetUserId = registered.body.user.id;
  });

  afterAll(async () => {
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
  });

  it('rejects an unauthenticated grant', async () => {
    await request(app.getHttpServer())
      .post(`/users/${targetUserId}/roles/grant`)
      .send({ role: UserRole.STEWARD })
      .expect(401);
  });

  it('rejects a grant from a plain MEMBER', async () => {
    await request(app.getHttpServer())
      .post(`/users/${targetUserId}/roles/grant`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ role: UserRole.STEWARD })
      .expect(403);
  });

  it('allows a Platform Administrator to grant STEWARD', async () => {
    const res = await request(app.getHttpServer())
      .post(`/users/${targetUserId}/roles/grant`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ role: UserRole.STEWARD })
      .expect(201);

    expect(res.body.roles).toEqual(expect.arrayContaining([UserRole.MEMBER, UserRole.STEWARD]));
  });

  it('rejects granting a role the user already holds', async () => {
    await request(app.getHttpServer())
      .post(`/users/${targetUserId}/roles/grant`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ role: UserRole.STEWARD })
      .expect(409);
  });

  it('rejects granting the protected MEMBER role', async () => {
    await request(app.getHttpServer())
      .post(`/users/${targetUserId}/roles/grant`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ role: UserRole.MEMBER })
      .expect(409);
  });

  it('rejects a Platform Administrator granting a System-Administrator-only role', async () => {
    await request(app.getHttpServer())
      .post(`/users/${targetUserId}/roles/grant`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ role: UserRole.PLATFORM_ADMINISTRATOR })
      .expect(403);
  });

  it('allows a System Administrator to grant PLATFORM_ADMINISTRATOR', async () => {
    const res = await request(app.getHttpServer())
      .post(`/users/${targetUserId}/roles/grant`)
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .send({ role: UserRole.PLATFORM_ADMINISTRATOR })
      .expect(201);

    expect(res.body.roles).toContain(UserRole.PLATFORM_ADMINISTRATOR);
  });

  it('rejects an administrator modifying their own roles', async () => {
    await request(app.getHttpServer())
      .post(`/users/${platformAdminId}/roles/grant`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ role: UserRole.STEWARD })
      .expect(403);
  });

  it('filters the user list by role', async () => {
    const res = await request(app.getHttpServer())
      .get('/users')
      .query({ role: UserRole.STEWARD })
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .expect(200);

    expect(res.body.data.some((u: { id: string }) => u.id === targetUserId)).toBe(true);
  });

  it('rejects revoking a role the user does not hold', async () => {
    await request(app.getHttpServer())
      .post(`/users/${targetUserId}/roles/revoke`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ role: UserRole.BUSINESS_REPRESENTATIVE })
      .expect(409);
  });

  it('allows a Platform Administrator to revoke STEWARD', async () => {
    const res = await request(app.getHttpServer())
      .post(`/users/${targetUserId}/roles/revoke`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ role: UserRole.STEWARD })
      .expect(201);

    expect(res.body.roles).not.toContain(UserRole.STEWARD);
  });

  it('rejects a Platform Administrator revoking a System-Administrator-only role', async () => {
    await request(app.getHttpServer())
      .post(`/users/${targetUserId}/roles/revoke`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ role: UserRole.PLATFORM_ADMINISTRATOR })
      .expect(403);
  });

  it('rejects revoking the protected MEMBER role', async () => {
    await request(app.getHttpServer())
      .post(`/users/${targetUserId}/roles/revoke`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ role: UserRole.MEMBER })
      .expect(409);
  });

  it('rejects revoking a user\'s last remaining role', async () => {
    const soleRoleUser = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `${emailMarker}-sole@aureus.test`, password: 'Str0ng!Passw0rd' })
      .expect(201);
    const soleRoleUserId = soleRoleUser.body.user.id;

    // Directly seed a single non-MEMBER role to exercise the "last role" guard
    // without needing a separate role-replacement endpoint.
    await prisma.db.user.update({
      where: { id: soleRoleUserId },
      data: { roles: [UserRole.STEWARD] },
    });

    await request(app.getHttpServer())
      .post(`/users/${soleRoleUserId}/roles/revoke`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ role: UserRole.STEWARD })
      .expect(409);
  });
});
