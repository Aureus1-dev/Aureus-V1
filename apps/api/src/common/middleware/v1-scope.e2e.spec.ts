import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../../app.module';

/**
 * End-to-end proof that C2 — V1 Scope Lockdown actually closes the gated
 * domains through the real HTTP/guard stack, not just at the unit level
 * (see v1-scope.middleware.spec.ts for the unit coverage). Runs with the
 * default flags (all off) — Academy's and Pods' own e2e suites flip
 * their flag on to keep proving the underlying domain still works.
 */
describe('C2 — V1 Scope Lockdown — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  const memberToken = () =>
    jwt.sign({ sub: randomUUID(), email: 'v1-scope-e2e@example.test', roles: [UserRole.MEMBER] });

  it('404s /academy for an authenticated member', async () => {
    await request(app.getHttpServer())
      .get('/academy/courses')
      .set('Authorization', `Bearer ${memberToken()}`)
      .expect(404);
  });

  it('404s /pods for an authenticated member', async () => {
    await request(app.getHttpServer())
      .get('/pods')
      .set('Authorization', `Bearer ${memberToken()}`)
      .expect(404);
  });

  it('404s /ai/voice/sessions for an authenticated member', async () => {
    await request(app.getHttpServer())
      .post('/ai/voice/sessions')
      .set('Authorization', `Bearer ${memberToken()}`)
      .send({})
      .expect(404);
  });

  it('leaves an in-scope route reachable', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});
