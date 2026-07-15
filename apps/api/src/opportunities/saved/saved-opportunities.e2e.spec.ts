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
 * End-to-end test for the WO-022 self-only authorization retrofit on
 * SavedOpportunity — mirrors the pre-existing SavedResources e2e coverage.
 * SavedOpportunity.userId has no FK, but opportunityId does, so a real
 * Opportunity is created via a STEWARD-role token first.
 *
 * Requires DATABASE_URL and JWT_ACCESS_SECRET (see test/jest.setup.js).
 */
describe('SavedOpportunities — E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  const titleMarker = `E2E-WO022-SAVEDOPP-${randomUUID()}-`;

  const stewardId = randomUUID();
  const ownerId = randomUUID();
  const otherMemberId = randomUUID();

  const tokenFor = (id: string, roles: UserRole[]): string =>
    jwt.sign({ sub: id, email: `${id}@example.test`, roles });

  let stewardToken: string;
  let ownerToken: string;
  let otherMemberToken: string;
  let opportunityId: string;

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

    stewardToken = tokenFor(stewardId, [UserRole.STEWARD]);
    ownerToken = tokenFor(ownerId, [UserRole.MEMBER]);
    otherMemberToken = tokenFor(otherMemberId, [UserRole.MEMBER]);

    const created = await request(app.getHttpServer())
      .post('/opportunities')
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({
        title: `${titleMarker}Federal Pell Grant`,
        shortDescription: 'Need-based grant for undergraduates',
        fullDescription: 'A full description of the Federal Pell Grant program and eligibility.',
        category: 'GRANT',
        provider: 'U.S. Department of Education',
        officialSourceUrl: 'https://studentaid.gov/understand-aid/types/grants/pell',
        eligibilityRules: 'Must demonstrate financial need and be enrolled in an accredited institution.',
        benefitType: 'GRANT',
        sourceName: 'Federal Student Aid',
        submittedById: stewardId,
        createdById: stewardId,
      })
      .expect(201);
    opportunityId = created.body.id;
  });

  afterAll(async () => {
    await prisma.db.savedOpportunity.deleteMany({ where: { opportunityId } });
    await prisma.db.opportunity.deleteMany({ where: { title: { startsWith: titleMarker } } });
    await app.close();
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer())
      .post(`/users/${ownerId}/saved-opportunities`)
      .send({ opportunityId })
      .expect(401);
  });

  it('forbids a caller managing another user\'s saved list', async () => {
    await request(app.getHttpServer())
      .post(`/users/${ownerId}/saved-opportunities`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .send({ opportunityId })
      .expect(403);
  });

  it('allows a member to save and list their own opportunity', async () => {
    await request(app.getHttpServer())
      .post(`/users/${ownerId}/saved-opportunities`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ opportunityId, isFavorite: true })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/users/${ownerId}/saved-opportunities`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(list.body.some((s: { opportunityId: string }) => s.opportunityId === opportunityId)).toBe(true);
  });

  it('forbids a non-owner from listing another user\'s saved opportunities', async () => {
    await request(app.getHttpServer())
      .get(`/users/${ownerId}/saved-opportunities`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .expect(403);
  });

  it('removes a saved opportunity', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${ownerId}/saved-opportunities/${opportunityId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
  });
});
