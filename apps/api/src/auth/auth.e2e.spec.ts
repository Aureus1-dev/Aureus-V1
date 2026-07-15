import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_SERVICE, IEmailService } from '../email/email.service.interface';

/**
 * End-to-end test for the WO-023 email delivery integration. Boots the full
 * application (real HTTP layer, real guards, real database) but overrides
 * only the EMAIL_SERVICE DI binding with a mock — the same technique the
 * unit tests use for repositories — so the test verifies AuthService's real
 * register/forgot-password/verify-email/reset-password logic wired to a
 * captured "would have been sent" email, without requiring a real SMTP
 * server in CI.
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

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_SERVICE)
      .useValue(mockEmailService)
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
});
