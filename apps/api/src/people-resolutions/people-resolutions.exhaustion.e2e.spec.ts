import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NeedOutcomeStatus,
  ResponsibilityEvidenceLevel,
  ResponsibilityStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { CitySheetService } from '../city-sheet/city-sheet.service';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('People Step 1 hardening — durable exhaustion E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;
  let ownerId: string;
  let ownerToken: string;
  let statedNeedId: string;
  let responsibilityId: string;

  const marker = 'people-step1-exhaustion-' + randomUUID();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CitySheetService)
      .useValue({
        findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      })
      .overrideProvider(UsersService)
      .useValue({
        findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    const email = `owner-${marker}@example.test`;
    const owner = await prisma.db.user.create({ data: { email } });
    ownerId = owner.id;
    ownerToken = jwt.sign({ sub: ownerId, email, roles: [UserRole.MEMBER] });

    const conversation = await request(app.getHttpServer())
      .post('/ai/conversations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'People Step 1 durable exhaustion' })
      .expect(201);

    const need = await prisma.db.statedNeed.create({
      data: {
        userId: ownerId,
        conversationId: conversation.body.id,
        content: 'My electric bill is overdue and my utilities will be shut off Friday',
      },
    });
    statedNeedId = need.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.db.needOutcomeReport.deleteMany({ where: { userId: ownerId } });
      await prisma.db.unresolvedNeed.deleteMany({ where: { userId: ownerId } });
      await prisma.db.responsibility.deleteMany({ where: { principalUserId: ownerId } });
      await prisma.db.statedNeed.deleteMany({ where: { userId: ownerId } });
      await prisma.db.user.deleteMany({ where: { id: ownerId } });
    }
    if (app) await app.close();
  });

  it('requires a persisted no-route record plus a later still-unresolved report, then writes both evidence records before exhaustion', async () => {
    const accepted = await request(app.getHttpServer())
      .post('/people/resolutions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ statedNeedId, objective: 'Help me keep my electricity on' })
      .expect(201);

    responsibilityId = accepted.body.responsibility.id;
    expect(accepted.body.responsibility.status).toBe(ResponsibilityStatus.ACTIVE);
    expect(accepted.body.routeKind).toBe('NONE');

    const unresolved = await prisma.db.unresolvedNeed.findUniqueOrThrow({
      where: { statedNeedId },
    });

    // Make the evidence order deterministic across database timestamp precision.
    await prisma.db.unresolvedNeed.update({
      where: { id: unresolved.id },
      data: { createdAt: new Date(Date.now() - 1000) },
    });

    const exhausted = await request(app.getHttpServer())
      .post(`/people/resolutions/${responsibilityId}/outcome`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ resolved: false, note: 'I still need help.' })
      .expect(201);

    expect(exhausted.body.responsibility.status).toBe(
      ResponsibilityStatus.RESPONSIBLY_EXHAUSTED,
    );
    expect(exhausted.body.nextStep).toContain('could not achieve');

    const report = await prisma.db.needOutcomeReport.findFirstOrThrow({
      where: {
        statedNeedId,
        status: NeedOutcomeStatus.STILL_UNRESOLVED,
      },
      orderBy: { createdAt: 'desc' },
    });

    const stored = await prisma.db.responsibility.findUniqueOrThrow({
      where: { id: responsibilityId },
      include: { events: { orderBy: { occurredAt: 'asc' } } },
    });

    const evidenceEvents = stored.events.filter(
      (event) => event.type === 'ACTION_EVIDENCED',
    );
    expect(evidenceEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceSystem: 'NEEDS',
          sourceRecordType: 'UnresolvedNeed',
          sourceRecordId: unresolved.id,
          sourceState: 'NO_VERIFIED_RESOURCE_NO_STEWARD',
          evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
        }),
        expect.objectContaining({
          sourceSystem: 'NEEDS',
          sourceRecordType: 'NeedOutcomeReport',
          sourceRecordId: report.id,
          sourceState: NeedOutcomeStatus.STILL_UNRESOLVED,
          evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
        }),
      ]),
    );

    const terminal = stored.events.find(
      (event) => event.type === 'RESPONSIBLY_EXHAUSTED',
    );
    expect(terminal).toEqual(
      expect.objectContaining({
        sourceRecordType: 'UnresolvedNeed',
        sourceRecordId: unresolved.id,
        evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
      }),
    );
  });
});
