import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler';
import request from 'supertest';
import { generate } from 'otplib';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_SERVICE, IEmailService } from '../email/email.service.interface';

/**
 * End-to-end test for the auth module's email-dependent flows — originally
 * WO-023 (email delivery), extended in PD-001 (Production Foundation) to
 * cover the email-verification-enforced login, resend-verification, and
 * logout-everywhere hardening added in that work order, since they share
 * this exact rig. Boots the full application (real HTTP layer, real guards,
 * real database) but overrides only the EMAIL_SERVICE DI binding with a
 * mock — the same technique the unit tests use for repositories — so the
 * test verifies AuthService's real register/forgot-password/verify-email/
 * reset-password logic wired to a captured "would have been sent" email,
 * without requiring a real SMTP server in CI.
 *
 * The ThrottlerStorage backend is also overridden with a fake that reports
 * every request as fresh (never blocked): AUTH_THROTTLE (5 req/60s) is
 * tested at the unit level, not here — this file's real-timer request
 * volume (register/login/verify across many `it` blocks sharing one IP)
 * legitimately exceeds it, and this suite exists to verify business logic,
 * not rate-limit enforcement. ThrottlerGuard itself is bound globally via
 * APP_GUARD (app.module.ts), and NestJS's override mechanisms for
 * globally-applied enhancers (overrideGuard, overrideProvider(APP_GUARD))
 * don't reliably reach a guard registered that way — overriding the
 * storage backend it reads from is the one override that's guaranteed to
 * apply, since ThrottlerStorage is an ordinary injected provider.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('Auth — Email Delivery E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const emailMarker = `e2e-wo023-${randomUUID()}`;

  const mockEmailService: jest.Mocked<IEmailService> = {
    sendEmailVerification: jest.fn(),
    sendPasswordReset: jest.fn(),
  };

  const unthrottledStorage: ThrottlerStorage = {
    increment: async (): Promise<ThrottlerStorageRecord> => ({
      totalHits: 1,
      timeToExpire: 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_SERVICE)
      .useValue(mockEmailService)
      .overrideProvider(ThrottlerStorage)
      .useValue(unthrottledStorage)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
  });

  it('sends an email-verification email on registration', async () => {
    const email = `verify-${emailMarker}@example.test`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Passw0rd' })
      .expect(201);

    expect(mockEmailService.sendEmailVerification).toHaveBeenCalledWith(email, expect.any(String));
  });

  it('completes the email-verification flow end-to-end using the emailed token', async () => {
    const email = `verify2-${emailMarker}@example.test`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Passw0rd' })
      .expect(201);

    const [, token] = mockEmailService.sendEmailVerification.mock.calls[0];

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token })
      .expect(204);

    // The token is single-use — a second attempt must fail.
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token })
      .expect(401);
  });

  it('sends a password-reset email and completes the reset flow using the emailed token', async () => {
    const email = `reset-${emailMarker}@example.test`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'OldStr0ng!Passw0rd' })
      .expect(201);

    // Login is blocked until the email is verified (PD-001) — verify it
    // using the same emailed token flow the earlier test exercises, so this
    // test can still reach a real login attempt below.
    const [, verificationToken] = mockEmailService.sendEmailVerification.mock.calls[0];
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: verificationToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(204);

    expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith(email, expect.any(String));
    const [, token] = mockEmailService.sendPasswordReset.mock.calls[0];

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'NewStr0ng!Passw0rd' })
      .expect(204);

    // Old password no longer works; new password does.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'OldStr0ng!Passw0rd' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'NewStr0ng!Passw0rd' })
      .expect(200);
  });

  it('does not send an email, and returns 204 regardless, for an unregistered address', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: `ghost-${emailMarker}@example.test` })
      .expect(204);

    expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  // ── Email verification enforcement + resend (PD-001) ─────────────────

  it('blocks login until the email is verified, and a resent verification token also works', async () => {
    const email = `unverified-${emailMarker}@example.test`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Passw0rd' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Str0ng!Passw0rd' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ email })
      .expect(204);

    expect(mockEmailService.sendEmailVerification).toHaveBeenCalledTimes(2);
    const [, resentToken] = mockEmailService.sendEmailVerification.mock.calls[1];

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: resentToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Str0ng!Passw0rd' })
      .expect(200);
  });

  // ── logout-everywhere (PD-001) ─────────────────────────────────────────

  it('logout-everywhere revokes a refresh token issued by an earlier login', async () => {
    const email = `logout-everywhere-${emailMarker}@example.test`;

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Passw0rd' })
      .expect(201);
    const [, verificationToken] = mockEmailService.sendEmailVerification.mock.calls.at(-1)!;
    await request(app.getHttpServer()).post('/auth/verify-email').send({ token: verificationToken }).expect(204);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Str0ng!Passw0rd' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/logout-everywhere')
      .set('Authorization', `Bearer ${registerRes.body.tokens.accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginRes.body.tokens.refreshToken })
      .expect(401);
  });

  // ── MFA enrollment + challenge-response login (PD-001) ────────────────

  it('enrolls TOTP MFA, then requires a code to complete the next login', async () => {
    const email = `mfa-${emailMarker}@example.test`;

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Passw0rd' })
      .expect(201);
    const [, verificationToken] = mockEmailService.sendEmailVerification.mock.calls.at(-1)!;
    await request(app.getHttpServer()).post('/auth/verify-email').send({ token: verificationToken }).expect(204);

    const accessToken = registerRes.body.tokens.accessToken;

    const enrollRes = await request(app.getHttpServer())
      .post('/auth/mfa/enroll')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
    expect(enrollRes.body.secret).toEqual(expect.any(String));

    const enrollCode = await generate({ secret: enrollRes.body.secret });
    const enableRes = await request(app.getHttpServer())
      .post('/auth/mfa/enable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: enrollCode })
      .expect(200);
    expect(enableRes.body.recoveryCodes).toHaveLength(8);

    // The next login returns a challenge instead of tokens.
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Str0ng!Passw0rd' })
      .expect(200);
    expect(loginRes.body.mfaRequired).toBe(true);
    expect(loginRes.body.tokens).toBeUndefined();

    const loginCode = await generate({ secret: enrollRes.body.secret });
    const completedRes = await request(app.getHttpServer())
      .post('/auth/mfa/verify-login')
      .send({ mfaToken: loginRes.body.mfaToken, code: loginCode })
      .expect(200);
    expect(completedRes.body.tokens.accessToken).toEqual(expect.any(String));

    // Disabling requires the password, then a normal login works again.
    await request(app.getHttpServer())
      .post('/auth/mfa/disable')
      .set('Authorization', `Bearer ${completedRes.body.tokens.accessToken}`)
      .send({ password: 'Str0ng!Passw0rd' })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Str0ng!Passw0rd' })
      .expect(200);
  });
});
