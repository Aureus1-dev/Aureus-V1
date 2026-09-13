import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthorityCapability, AuthorityContextType, AuthorityRequestSource, AuthorityResourceClass, OrganizationMemberRole, OrganizationType } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

describe('Authority, Consent & Trust — E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const marker = `step2-${randomUUID()}`;
  let ownerId: string;
  let employeeId: string;
  let outsiderId: string;
  let ownerToken: string;
  let employeeToken: string;
  let outsiderToken: string;
  let orgId: string;
  let outsiderOrgId: string;
  let privateConversationId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);

    async function register(label: string) {
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: `${label}-${marker}@example.test`, password: 'Str0ng!Passw0rd',
      }).expect(201);
      return { id: response.body.user.id as string, token: response.body.tokens.accessToken as string };
    }
    const owner = await register('owner');
    const employee = await register('employee');
    const outsider = await register('outsider');
    ownerId = owner.id; ownerToken = owner.token;
    employeeId = employee.id; employeeToken = employee.token;
    outsiderId = outsider.id; outsiderToken = outsider.token;

    const org = await prisma.db.organization.create({
      data: {
        name: `Step 2 Business ${marker}`, shortDescription: 'test', fullDescription: 'test',
        organizationType: OrganizationType.BUSINESS, websiteUrl: 'https://example.test',
        createdById: ownerId, lastUpdatedById: ownerId,
        members: { create: [
          { userId: ownerId, role: OrganizationMemberRole.OWNER },
          { userId: employeeId, role: OrganizationMemberRole.MEMBER },
        ] },
      },
    });
    orgId = org.id;
    const outsiderOrg = await prisma.db.organization.create({
      data: {
        name: `Other Business ${marker}`, shortDescription: 'test', fullDescription: 'test',
        organizationType: OrganizationType.BUSINESS, websiteUrl: 'https://other.example.test',
        createdById: outsiderId, lastUpdatedById: outsiderId,
        members: { create: { userId: outsiderId, role: OrganizationMemberRole.OWNER } },
      },
    });
    outsiderOrgId = outsiderOrg.id;
    privateConversationId = (await prisma.db.aiConversation.create({ data: { userId: employeeId } })).id;
  });

  afterAll(async () => {
    const orgs = [orgId, outsiderOrgId].filter(Boolean);
    const users = [ownerId, employeeId, outsiderId].filter(Boolean);
    await prisma.db.authorityDecision.deleteMany({ where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }, { actorUserId: { in: users } }] } });
    await prisma.db.authorityEvent.deleteMany({ where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }, { actorUserId: { in: users } }] } });
    await prisma.db.authorityCapabilityState.deleteMany({ where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }] } });
    await prisma.db.authorityGrant.deleteMany({ where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }] } });
    await prisma.db.authorityRequest.deleteMany({ where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }, { requestedByUserId: { in: users } }] } });
    await prisma.db.organization.deleteMany({ where: { id: { in: orgs } } });
    await prisma.db.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('keeps a pending Personal request non-authoritative, then permits only after self approval and denies immediately after revoke', async () => {
    const created = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.PERSONAL,
      subjectUserId: employeeId,
      capability: AuthorityCapability.READ,
      resourceClass: AuthorityResourceClass.FILES,
      purpose: 'Read files I choose for this work',
    }).expect(201);

    const evaluation = { contextType: AuthorityContextType.PERSONAL, subjectUserId: employeeId, capability: AuthorityCapability.READ, resourceClass: AuthorityResourceClass.FILES };
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('NEEDS_APPROVAL');

    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(outsiderToken)).send({}).expect(404);
    const grant = await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('PERMIT');

    await request(app.getHttpServer()).post(`/authority/grants/${grant.body.id}/revoke`).set(auth(employeeToken)).send({ reason: 'I changed my mind' }).expect(201);
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('DENY');
  });

  it('lets the business OWNER approve organization-owned authority for only that tenant', async () => {
    const created = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      capability: AuthorityCapability.READ,
      resourceClass: AuthorityResourceClass.BUSINESS_DATA,
      purpose: 'Read approved company operating data',
    }).expect(201);

    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(outsiderToken)).send({}).expect(404);
    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(ownerToken)).send({}).expect(201);
    const evalResult = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      capability: AuthorityCapability.READ,
      resourceClass: AuthorityResourceClass.BUSINESS_DATA,
    }).expect(201);
    expect(evalResult.body.result).toBe('PERMIT');
  });

  it('never lets the employer approve an employee microphone permission; the employee can approve, suspend, and restore it', async () => {
    const created = await request(app.getHttpServer()).post('/authority/requests').set(auth(ownerToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.LISTEN,
      resourceClass: AuthorityResourceClass.MICROPHONE,
      purpose: 'Listen only while I explicitly work with Aureus',
    }).expect(201);

    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(ownerToken)).send({}).expect(404);
    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);

    const evaluation = {
      contextType: AuthorityContextType.BUSINESS_TENANT, organizationId: orgId, subjectUserId: employeeId,
      capability: AuthorityCapability.LISTEN, resourceClass: AuthorityResourceClass.MICROPHONE,
    };
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('PERMIT');

    await request(app.getHttpServer()).post('/authority/capabilities/suspend').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT, organizationId: orgId, subjectUserId: employeeId,
      capability: AuthorityCapability.LISTEN, reason: "Aureus shouldn't have done this",
    }).expect(201);
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('DENY');

    await request(app.getHttpServer()).post('/authority/capabilities/resume').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT, organizationId: orgId, subjectUserId: employeeId,
      capability: AuthorityCapability.LISTEN,
    }).expect(201);
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('PERMIT');
  });

  it('requires the employee and an exact conversation reference for private transcript sharing', async () => {
    const created = await request(app.getHttpServer()).post('/authority/requests').set(auth(ownerToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.SHARE,
      resourceClass: AuthorityResourceClass.CONVERSATION,
      resourceRef: privateConversationId,
      purpose: 'Share this exact conversation with the company',
    }).expect(201);
    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(ownerToken)).send({}).expect(404);
    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);

    await request(app.getHttpServer()).post('/authority/requests').set(auth(ownerToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.SHARE,
      resourceClass: AuthorityResourceClass.CONVERSATION,
      purpose: 'Blanket transcript sharing',
    }).expect(400);
  });

  it('keeps derived-pattern authority as a proposal and ignores an expired grant', async () => {
    const derived = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.PERSONAL, subjectUserId: employeeId,
      capability: AuthorityCapability.ACT, resourceClass: AuthorityResourceClass.OTHER,
      purpose: 'A repeated pattern suggests this may be useful', source: AuthorityRequestSource.DERIVED_PATTERN,
    }).expect(201);
    expect(derived.body.status).toBe('PENDING');

    const expiring = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.PERSONAL, subjectUserId: employeeId,
      capability: AuthorityCapability.SEE, resourceClass: AuthorityResourceClass.OTHER,
      purpose: 'Temporary visibility', expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }).expect(201);
    const grant = await request(app.getHttpServer()).post(`/authority/requests/${expiring.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);
    await prisma.db.authorityGrant.update({ where: { id: grant.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const result = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.PERSONAL, subjectUserId: employeeId,
      capability: AuthorityCapability.SEE, resourceClass: AuthorityResourceClass.OTHER,
    }).expect(201);
    expect(result.body.result).not.toBe('PERMIT');
  });

  it('rejects secret material from the authority ledger and exposes a plain trust snapshot', async () => {
    await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.PERSONAL, subjectUserId: employeeId,
      capability: AuthorityCapability.READ, resourceClass: AuthorityResourceClass.OTHER,
      purpose: 'password=super-secret-value',
    }).expect(400);

    const snapshot = await request(app.getHttpServer()).get('/authority/trust').set(auth(employeeToken)).expect(200);
    expect(snapshot.body.policyVersion).toBe('step2-v1');
    expect(Array.isArray(snapshot.body.requests)).toBe(true);
    expect(Array.isArray(snapshot.body.grants)).toBe(true);
    expect(Array.isArray(snapshot.body.events)).toBe(true);
    expect(JSON.stringify(snapshot.body)).not.toContain('super-secret-value');
  });
});
