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
 * End-to-end test: boots the full Nest application and exercises the
 * Connected Experiences domain (DOMAIN-008) golden path — a member connects
 * a provider and receives an honest Coming Soon status with an audit-log
 * entry (never a fabricated success), and separately uploads, summarizes,
 * and deletes a Document — plus the self-only ownership boundary that
 * every other member is blocked from.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('Connected Experiences — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  const emailMarker = `e2e-domain008-${randomUUID()}`;

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  let memberId: string;
  let memberToken: string;
  let outsiderId: string;
  let outsiderToken: string;
  let documentId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    const register = async (label: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `${label}-${emailMarker}@example.test`, password: 'Str0ng!Passw0rd' })
        .expect(201);
      return res.body.user.id as string;
    };

    memberId = await register('member');
    memberToken = tokenFor(memberId, [UserRole.MEMBER]);
    outsiderId = await register('outsider');
    outsiderToken = tokenFor(outsiderId, [UserRole.MEMBER]);
  });

  afterAll(async () => {
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/connected-accounts').expect(401);
  });

  describe('Connected Accounts — never simulates a successful connection', () => {
    it('lists the full provider catalog with Coming Soon status for every provider', async () => {
      const res = await request(app.getHttpServer())
        .get('/connected-accounts')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((item: { connectionState: string }) => item.connectionState === 'COMING_SOON')).toBe(true);
      expect(res.body.every((item: { account?: unknown }) => item.account === undefined)).toBe(true);
    });

    it('connecting an unconfigured provider reports Coming Soon and creates no account', async () => {
      const res = await request(app.getHttpServer())
        .post('/connected-accounts/GMAIL/connect')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      expect(res.body.status).toBe('COMING_SOON');
      expect(res.body.account).toBeUndefined();
    });

    it('records the connection attempt in the Steward activity trail', async () => {
      const res = await request(app.getHttpServer())
        .get('/steward-activity')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.data.some((entry: { eventType: string }) => entry.eventType === 'CONNECTION_REQUESTED')).toBe(true);
    });

    it('revoking a never-connected provider returns 404', async () => {
      await request(app.getHttpServer())
        .post('/connected-accounts/GMAIL/revoke')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(404);
    });
  });

  describe('Documents — fully real, self-only', () => {
    it('a member uploads a document with a stable AUR-DOC ref', async () => {
      const res = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Lease Agreement', originalFilename: 'lease.pdf', mimeType: 'application/pdf',
          sizeBytes: 2048, storageRef: 'stub://lease.pdf', category: 'LEASE',
          extractedText: 'Lease term: 12 months. Rent: $1500/month. Landlord: Acme Properties.',
        })
        .expect(201);

      documentId = res.body.id;
      expect(res.body.documentRef).toMatch(/^AUR-DOC-\d{6}$/);
    });

    it('another member cannot read the document', async () => {
      await request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('the owner generates an AI summary from real extracted text', async () => {
      const res = await request(app.getHttpServer())
        .post(`/documents/${documentId}/summarize`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      expect(typeof res.body.aiSummary).toBe('string');
      expect(res.body.aiSummary.length).toBeGreaterThan(0);
    });

    it('another member cannot delete the document', async () => {
      await request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);
    });

    it('the owner deletes the document', async () => {
      await request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(404);
    });
  });
});
