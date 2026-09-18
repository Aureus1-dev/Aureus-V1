import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  AuthorityCapability,
  AuthorityContextType,
  AuthorityRequestSource,
  AuthorityResourceClass,
  AuthorityShareRecipientKind,
  OrganizationMemberRole,
  OrganizationType,
} from '@prisma/client';
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
  let employeeDocumentId: string;
  let outsiderDocumentId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);

    async function register(label: string) {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `${label}-${marker}@example.test`, password: 'Str0ng!Passw0rd' })
        .expect(201);
      return { id: response.body.user.id as string, token: response.body.tokens.accessToken as string };
    }

    const owner = await register('owner');
    const employee = await register('employee');
    const outsider = await register('outsider');
    ownerId = owner.id;
    ownerToken = owner.token;
    employeeId = employee.id;
    employeeToken = employee.token;
    outsiderId = outsider.id;
    outsiderToken = outsider.token;

    const org = await prisma.db.organization.create({
      data: {
        name: `Step 2 Business ${marker}`,
        shortDescription: 'test',
        fullDescription: 'test',
        organizationType: OrganizationType.BUSINESS,
        websiteUrl: 'https://example.test',
        createdById: ownerId,
        lastUpdatedById: ownerId,
        members: {
          create: [
            { userId: ownerId, role: OrganizationMemberRole.OWNER },
            { userId: employeeId, role: OrganizationMemberRole.MEMBER },
          ],
        },
      },
    });
    orgId = org.id;

    const outsiderOrg = await prisma.db.organization.create({
      data: {
        name: `Other Business ${marker}`,
        shortDescription: 'test',
        fullDescription: 'test',
        organizationType: OrganizationType.BUSINESS,
        websiteUrl: 'https://other.example.test',
        createdById: outsiderId,
        lastUpdatedById: outsiderId,
        members: { create: { userId: outsiderId, role: OrganizationMemberRole.OWNER } },
      },
    });
    outsiderOrgId = outsiderOrg.id;
    privateConversationId = (await prisma.db.aiConversation.create({ data: { userId: employeeId } })).id;

    employeeDocumentId = (
      await prisma.db.document.create({
        data: {
          userId: employeeId,
          title: 'Member document',
          originalFilename: 'member.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 100,
          storageRef: `test/authority/${marker}/member.pdf`,
        },
      })
    ).id;
    outsiderDocumentId = (
      await prisma.db.document.create({
        data: {
          userId: outsiderId,
          title: 'Outsider document',
          originalFilename: 'outsider.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 100,
          storageRef: `test/authority/${marker}/outsider.pdf`,
        },
      })
    ).id;
  });

  afterAll(async () => {
    const orgs = [orgId, outsiderOrgId].filter(Boolean);
    const users = [ownerId, employeeId, outsiderId].filter(Boolean);
    await prisma.db.authorityDecision.deleteMany({
      where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }, { actorUserId: { in: users } }] },
    });
    await prisma.db.authorityEvent.deleteMany({
      where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }, { actorUserId: { in: users } }] },
    });
    await prisma.db.authorityCapabilityState.deleteMany({
      where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }] },
    });
    await prisma.db.authorityGrant.deleteMany({
      where: { OR: [{ organizationId: { in: orgs } }, { subjectUserId: { in: users } }] },
    });
    await prisma.db.authorityRequest.deleteMany({
      where: {
        OR: [
          { organizationId: { in: orgs } },
          { subjectUserId: { in: users } },
          { requestedByUserId: { in: users } },
        ],
      },
    });
    await prisma.db.document.deleteMany({
      where: { id: { in: [employeeDocumentId, outsiderDocumentId].filter(Boolean) } },
    });
    await prisma.db.organization.deleteMany({ where: { id: { in: orgs } } });
    await prisma.db.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('keeps a pending Personal request non-authoritative, then permits only after self approval and denies immediately after revoke', async () => {
    const created = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.OTHER,
        purpose: 'Read information I choose for this work',
      })
      .expect(201);

    const evaluation = {
      contextType: AuthorityContextType.PERSONAL,
      subjectUserId: employeeId,
      capability: AuthorityCapability.READ,
      resourceClass: AuthorityResourceClass.OTHER,
      purpose: 'Read information I choose for this work',
    };
    expect(
      (await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result,
    ).toBe('NEEDS_APPROVAL');

    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(outsiderToken))
      .send({})
      .expect(404);
    const grant = await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(employeeToken))
      .send({})
      .expect(201);
    expect(
      (await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result,
    ).toBe('PERMIT');

    const wrongPurpose = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({ ...evaluation, purpose: 'Use the same files for an unrelated purpose' })
      .expect(201);
    expect(wrongPurpose.body.result).toBe('NEEDS_APPROVAL');

    await request(app.getHttpServer())
      .post(`/authority/grants/${grant.body.id}/revoke`)
      .set(auth(outsiderToken))
      .send({ reason: 'not mine' })
      .expect(404);
    await request(app.getHttpServer())
      .post(`/authority/grants/${grant.body.id}/revoke`)
      .set(auth(employeeToken))
      .send({ reason: 'I changed my mind' })
      .expect(201);
    expect(
      (await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result,
    ).toBe('DENY');
  });

  it('lets the business OWNER approve organization-owned authority for only that tenant', async () => {
    const created = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.BUSINESS_DATA,
        purpose: 'Read approved company operating data',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(outsiderToken))
      .send({})
      .expect(404);
    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(ownerToken))
      .send({})
      .expect(201);
    const evalResult = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.BUSINESS_DATA,
        purpose: 'Read approved company operating data',
      })
      .expect(201);
    expect(evalResult.body.result).toBe('PERMIT');
  });

  it('rejects attempts to disguise organization-owned authority as employee-owned authority', async () => {
    await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        subjectUserId: employeeId,
        capability: AuthorityCapability.ACT,
        resourceClass: AuthorityResourceClass.BUSINESS_DATA,
        purpose: 'Act on company operating data in my work context',
      })
      .expect(400);

    const gateway = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        subjectUserId: employeeId,
        capability: AuthorityCapability.ACT,
        resourceClass: AuthorityResourceClass.BUSINESS_DATA,
        purpose: 'Act on company operating data in my work context',
      })
      .expect(201);
    expect(gateway.body.result).toBe('DENY');
  });

  it('rechecks the current organization OWNER at approval time', async () => {
    const created = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(ownerToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        capability: AuthorityCapability.WRITE,
        resourceClass: AuthorityResourceClass.BUSINESS_DATA,
        purpose: 'Write approved company operating data',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/members/ownership/transfer`)
      .set(auth(ownerToken))
      .send({ newOwnerUserId: employeeId })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(ownerToken))
      .send({})
      .expect(404);
    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(employeeToken))
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/members/ownership/transfer`)
      .set(auth(employeeToken))
      .send({ newOwnerUserId: ownerId })
      .expect(200);
  });

  it('never lets the employer approve an employee microphone permission; the employee can approve, suspend, and restore it', async () => {
    const created = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(ownerToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        subjectUserId: employeeId,
        capability: AuthorityCapability.LISTEN,
        resourceClass: AuthorityResourceClass.MICROPHONE,
        purpose: 'Listen only while I explicitly work with Aureus',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(ownerToken))
      .send({})
      .expect(404);
    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(employeeToken))
      .send({})
      .expect(201);

    const evaluation = {
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.LISTEN,
      resourceClass: AuthorityResourceClass.MICROPHONE,
      purpose: 'Listen only while I explicitly work with Aureus',
    };
    expect(
      (await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result,
    ).toBe('PERMIT');

    await request(app.getHttpServer())
      .post('/authority/capabilities/suspend')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        subjectUserId: employeeId,
        capability: AuthorityCapability.LISTEN,
        reason: "Aureus shouldn't have done this",
      })
      .expect(201);
    expect(
      (await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result,
    ).toBe('DENY');

    await request(app.getHttpServer())
      .post('/authority/capabilities/resume')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        subjectUserId: employeeId,
        capability: AuthorityCapability.LISTEN,
      })
      .expect(201);
    expect(
      (await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result,
    ).toBe('PERMIT');
  });

  it('requires the employee and an exact conversation reference for private transcript sharing', async () => {
    const created = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(ownerToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        subjectUserId: employeeId,
        capability: AuthorityCapability.SHARE,
        resourceClass: AuthorityResourceClass.CONVERSATION,
        resourceRef: privateConversationId,
        purpose: 'Share this exact conversation with the company',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(ownerToken))
      .send({})
      .expect(404);
    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(employeeToken))
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(ownerToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        subjectUserId: employeeId,
        capability: AuthorityCapability.SHARE,
        resourceClass: AuthorityResourceClass.CONVERSATION,
        purpose: 'Blanket transcript sharing',
      })
      .expect(400);
  });

  it('requires exact person ownership for human/private resources at the gateway', async () => {
    const noPerson = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        capability: AuthorityCapability.LISTEN,
        resourceClass: AuthorityResourceClass.MICROPHONE,
        purpose: 'Listen without a named person',
      })
      .expect(201);
    expect(noPerson.body.result).toBe('DENY');

    const noAccountRef = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.BUSINESS_TENANT,
        organizationId: orgId,
        subjectUserId: employeeId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.CONNECTED_ACCOUNT,
        purpose: 'Read a connected account without an exact reference',
      })
      .expect(201);
    expect(noAccountRef.body.result).toBe('DENY');
  });

  it('revoking one duplicate grant takes back the exact permission completely', async () => {
    const body = {
      contextType: AuthorityContextType.PERSONAL,
      subjectUserId: employeeId,
      capability: AuthorityCapability.SEE,
      resourceClass: AuthorityResourceClass.FILES,
      purpose: 'See files I choose',
    };
    const first = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send(body).expect(201);
    const second = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send(body).expect(201);
    const grant1 = await request(app.getHttpServer())
      .post(`/authority/requests/${first.body.id}/approve`)
      .set(auth(employeeToken))
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/authority/requests/${second.body.id}/approve`)
      .set(auth(employeeToken))
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/authority/grants/${grant1.body.id}/revoke`)
      .set(auth(employeeToken))
      .send({ reason: 'Take this permission back' })
      .expect(201);
    const result = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.SEE,
        resourceClass: AuthorityResourceClass.FILES,
        purpose: 'See files I choose',
      })
      .expect(201);
    expect(result.body.result).toBe('DENY');

    const active = await prisma.db.authorityGrant.count({
      where: {
        subjectUserId: employeeId,
        capability: AuthorityCapability.SEE,
        resourceClass: AuthorityResourceClass.FILES,
        status: 'ACTIVE',
      },
    });
    expect(active).toBe(0);
  });

  it('keeps derived-pattern authority as a proposal and ignores an expired grant', async () => {
    const derived = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.ACT,
        resourceClass: AuthorityResourceClass.OTHER,
        purpose: 'A repeated pattern suggests this may be useful',
        source: AuthorityRequestSource.DERIVED_PATTERN,
      })
      .expect(201);
    expect(derived.body.status).toBe('PENDING');

    const expiring = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.SEE,
        resourceClass: AuthorityResourceClass.OTHER,
        purpose: 'Temporary visibility',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })
      .expect(201);
    const grant = await request(app.getHttpServer())
      .post(`/authority/requests/${expiring.body.id}/approve`)
      .set(auth(employeeToken))
      .send({})
      .expect(201);
    await prisma.db.authorityGrant.update({
      where: { id: grant.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const result = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.SEE,
        resourceClass: AuthorityResourceClass.OTHER,
        purpose: 'Temporary visibility',
      })
      .expect(201);
    expect(result.body.result).not.toBe('PERMIT');
  });

  it('resume never manufactures authority when no active grant exists', async () => {
    const scope = {
      contextType: AuthorityContextType.PERSONAL,
      subjectUserId: employeeId,
      capability: AuthorityCapability.WRITE,
    };
    await request(app.getHttpServer())
      .post('/authority/capabilities/suspend')
      .set(auth(employeeToken))
      .send({ ...scope, reason: 'pause writes' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/authority/capabilities/resume')
      .set(auth(employeeToken))
      .send(scope)
      .expect(201);
    const result = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({ ...scope, resourceClass: AuthorityResourceClass.OTHER, purpose: 'Write selected information' })
      .expect(201);
    expect(result.body.result).toBe('NEEDS_APPROVAL');
  });


  it('requires exact owned Document scope for Personal read/write/share/act authority', async () => {
    await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.DOCUMENT,
        purpose: 'Read one exact document for this task',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.DOCUMENT,
        resourceRef: outsiderDocumentId,
        purpose: 'Read a document that is not mine',
      })
      .expect(404);

    const created = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.DOCUMENT,
        resourceRef: employeeDocumentId,
        purpose: 'Read one exact document for this task',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(employeeToken))
      .send({})
      .expect(201);

    const exact = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.DOCUMENT,
        resourceRef: employeeDocumentId,
        purpose: 'Read one exact document for this task',
      })
      .expect(201);
    expect(exact.body.result).toBe('PERMIT');

    const wrongDocument = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.DOCUMENT,
        resourceRef: outsiderDocumentId,
        purpose: 'Read one exact document for this task',
      })
      .expect(201);
    expect(wrongDocument.body.result).toBe('DENY');

    const legacyBroadFiles = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.FILES,
        purpose: 'Read all my files',
      })
      .expect(201);
    expect(legacyBroadFiles.body.result).toBe('DENY');
  });

  it('binds SHARE authority to exact recipient, purpose, resource, and minimum-data scope', async () => {
    const beforeConsentCount = await prisma.db.consentRecord.count({ where: { userId: employeeId } });

    await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.SHARE,
        resourceClass: AuthorityResourceClass.CONVERSATION,
        resourceRef: privateConversationId,
        purpose: 'Share the minimum case facts with the court',
        shareDataFields: ['case_number'],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.SHARE,
        resourceClass: AuthorityResourceClass.CONVERSATION,
        resourceRef: privateConversationId,
        purpose: 'Share the minimum case facts with the court',
        shareRecipientKind: AuthorityShareRecipientKind.INSTITUTION,
        shareRecipientRef: 'philadelphia-municipal-court',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.SHARE,
        resourceClass: AuthorityResourceClass.CONVERSATION,
        resourceRef: privateConversationId,
        purpose: 'Share the minimum case facts with the court',
        shareRecipientKind: AuthorityShareRecipientKind.INSTITUTION,
        shareRecipientRef: 'philadelphia-municipal-court',
        shareDataFields: ['full_transcript'],
      })
      .expect(400);

    const body = {
      contextType: AuthorityContextType.PERSONAL,
      subjectUserId: employeeId,
      capability: AuthorityCapability.SHARE,
      resourceClass: AuthorityResourceClass.CONVERSATION,
      resourceRef: privateConversationId,
      purpose: 'Share the minimum case facts with the court',
      shareRecipientKind: AuthorityShareRecipientKind.INSTITUTION,
      shareRecipientRef: 'philadelphia-municipal-court',
      shareDataFields: ['name', 'case_number', 'hearing_date'],
    };
    const created = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send(body)
      .expect(201);

    const grant = await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set(auth(employeeToken))
      .send({})
      .expect(201);
    expect(grant.body.shareRecipientRef).toBe('philadelphia-municipal-court');
    expect(grant.body.shareDataFields).toEqual(['case_number', 'hearing_date', 'name']);

    const exact = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send(body)
      .expect(201);
    expect(exact.body.result).toBe('PERMIT');

    const wrongRecipient = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({ ...body, shareRecipientRef: 'different-recipient' })
      .expect(201);
    expect(wrongRecipient.body.result).toBe('NEEDS_APPROVAL');

    const broaderPacket = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({ ...body, shareDataFields: [...body.shareDataFields, 'full_address'] })
      .expect(201);
    expect(broaderPacket.body.result).toBe('NEEDS_APPROVAL');

    const fullTranscript = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({ ...body, shareDataFields: ['full_transcript'] })
      .expect(201);
    expect(fullTranscript.body.result).toBe('DENY');

    const denied = await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        ...body,
        purpose: 'Share a different bounded packet',
        shareDataFields: ['case_number'],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/authority/requests/${denied.body.id}/deny`)
      .set(auth(employeeToken))
      .send({ reason: 'Not now' })
      .expect(201);
    const deniedEvaluation = await request(app.getHttpServer())
      .post('/authority/evaluate')
      .set(auth(employeeToken))
      .send({
        ...body,
        purpose: 'Share a different bounded packet',
        shareDataFields: ['case_number'],
      })
      .expect(201);
    expect(deniedEvaluation.body.result).not.toBe('PERMIT');

    const afterConsentCount = await prisma.db.consentRecord.count({ where: { userId: employeeId } });
    expect(afterConsentCount).toBe(beforeConsentCount);
  });

  it('rejects secret material from the authority ledger and exposes a plain trust snapshot', async () => {
    await request(app.getHttpServer())
      .post('/authority/requests')
      .set(auth(employeeToken))
      .send({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: employeeId,
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.OTHER,
        purpose: 'password=super-secret-value',
      })
      .expect(400);

    const snapshot = await request(app.getHttpServer())
      .get('/authority/trust')
      .set(auth(employeeToken))
      .expect(200);
    expect(snapshot.body.policyVersion).toBe('people-step2-v2');
    expect(Array.isArray(snapshot.body.requests)).toBe(true);
    expect(Array.isArray(snapshot.body.grants)).toBe(true);
    expect(Array.isArray(snapshot.body.events)).toBe(true);
    expect(JSON.stringify(snapshot.body)).not.toContain('super-secret-value');
  });
});
