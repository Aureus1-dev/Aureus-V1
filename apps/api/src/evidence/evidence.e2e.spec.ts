import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import {
  EvidenceRequirementStatus,
  EvidenceSufficiencyStatus,
  EvidenceVerificationResult,
  HouseholdMembershipStatus,
  HouseholdResponsibilityShareStatus,
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityEventType,
  ResponsibilityEvidenceLevel,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  ResponsibilityStatus,
  StewardshipRelationshipOrigin,
  StewardshipRelationshipStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

describe('PEOPLE-STEP6 Documents, Evidence & Verification E2E', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  const marker = 'people-step6-' + randomUUID();
  const tokenFor = (id: string, email: string, roles: UserRole[]) =>
    jwt.sign({ sub: id, email, roles });

  let memberId: string;
  let memberToken: string;
  let otherMemberId: string;
  let otherMemberToken: string;
  let stewardId: string;
  let stewardToken: string;
  let unauthorizedStewardId: string;
  let unauthorizedStewardToken: string;
  let adminId: string;
  let adminToken: string;
  let householdParticipantId: string;
  let householdParticipantToken: string;
  let crossHouseholdParticipantId: string;
  let crossHouseholdParticipantToken: string;

  let responsibilityId: string;

  const createdUserIds: string[] = [];

  async function createUser(rolePrefix: string, roles: UserRole[]) {
    const email = `${rolePrefix}-${marker}@example.test`;
    const user = await prisma.db.user.create({ data: { email, roles } });
    createdUserIds.push(user.id);
    return { id: user.id, token: tokenFor(user.id, email, roles) };
  }

  async function createOwnedDocument(ownerId: string, title: string) {
    const doc = await prisma.db.document.create({
      data: {
        userId: ownerId,
        title,
        originalFilename: 'proof.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512,
        storageRef: `test/step6/${marker}/${randomUUID()}.pdf`,
      },
    });
    return doc.id;
  }

  async function grantStewardDocumentRead(memberToken_: string, documentId: string) {
    const created = await request(app.getHttpServer())
      .post('/authority/requests')
      .set('Authorization', `Bearer ${memberToken_}`)
      .send({
        contextType: 'PERSONAL',
        subjectUserId: memberId,
        capability: 'READ',
        resourceClass: 'DOCUMENT',
        resourceRef: documentId,
        purpose: 'people-step6-evidence-verification',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${memberToken_}`)
      .expect(201);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);

    const member = await createUser('member', [UserRole.MEMBER]);
    memberId = member.id;
    memberToken = member.token;
    const other = await createUser('other', [UserRole.MEMBER]);
    otherMemberId = other.id;
    otherMemberToken = other.token;
    const steward = await createUser('steward', [UserRole.MEMBER, UserRole.STEWARD]);
    stewardId = steward.id;
    stewardToken = steward.token;
    const unauthorizedSteward = await createUser('steward-noauth', [
      UserRole.MEMBER,
      UserRole.STEWARD,
    ]);
    unauthorizedStewardId = unauthorizedSteward.id;
    unauthorizedStewardToken = unauthorizedSteward.token;
    const admin = await createUser('admin', [UserRole.PLATFORM_ADMINISTRATOR]);
    adminId = admin.id;
    adminToken = admin.token;
    const houseParticipant = await createUser('house-participant', [UserRole.MEMBER]);
    householdParticipantId = houseParticipant.id;
    householdParticipantToken = houseParticipant.token;
    const crossHouseParticipant = await createUser('cross-house-participant', [UserRole.MEMBER]);
    crossHouseholdParticipantId = crossHouseParticipant.id;
    crossHouseholdParticipantToken = crossHouseParticipant.token;

    // Canonical Personal Need Responsibility (housing) — the proof case.
    const responsibility = await prisma.db.responsibility.create({
      data: {
        kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
        objective: 'Help the member document proof of address for a housing assistance application',
        status: ResponsibilityStatus.ACTIVE,
        contextType: ResponsibilityContextType.PERSONAL,
        principalUserId: memberId,
        originConversationId: randomUUID(),
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          statedNeedId: randomUUID(),
          completionRule: 'SOURCE_DOMAIN_OUTCOME_EVIDENCE_REQUIRED',
        },
        authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
        authorityPolicyVersion: 'people-step6-test',
        privacyScope: ResponsibilityPrivacyScope.PERSONAL_PRIVATE,
        privacyPolicyVersion: 'people-step6-test',
      },
    });
    responsibilityId = responsibility.id;

    // ACTIVE Stewardship relationship for the authorized steward only.
    await prisma.db.stewardshipRelationship.create({
      data: {
        memberId,
        stewardId,
        status: StewardshipRelationshipStatus.ACTIVE,
        origin: StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT,
        assignedById: adminId,
        activatedAt: new Date(),
      },
    });

    // Household sharing: householdParticipant is an ACTIVE participant on
    // THIS Responsibility; crossHouseholdParticipant belongs to an unrelated
    // household/Responsibility and must never see this one.
    const household = await prisma.db.household.create({ data: { createdByUserId: memberId } });
    await prisma.db.householdMembership.create({
      data: {
        householdId: household.id,
        userId: memberId,
        status: HouseholdMembershipStatus.ACTIVE,
        joinedAt: new Date(),
      },
    });
    await prisma.db.householdMembership.create({
      data: {
        householdId: household.id,
        userId: householdParticipantId,
        status: HouseholdMembershipStatus.ACTIVE,
        joinedAt: new Date(),
        invitedByUserId: memberId,
      },
    });
    await prisma.db.householdResponsibilityParticipant.create({
      data: {
        householdId: household.id,
        responsibilityId,
        participantUserId: householdParticipantId,
        status: HouseholdResponsibilityShareStatus.ACTIVE,
        invitedByUserId: memberId,
        acceptedAt: new Date(),
      },
    });

    // A second, wholly unrelated Responsibility + household so cross-household
    // leakage has something concrete to fail against.
    const otherResponsibility = await prisma.db.responsibility.create({
      data: {
        kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
        objective: 'Unrelated other-member responsibility',
        status: ResponsibilityStatus.ACTIVE,
        contextType: ResponsibilityContextType.PERSONAL,
        principalUserId: otherMemberId,
        originConversationId: randomUUID(),
        successCriteria: { type: 'PERSONAL_NEED_RESOLUTION', statedNeedId: randomUUID() },
        authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
        authorityPolicyVersion: 'people-step6-test',
        privacyScope: ResponsibilityPrivacyScope.PERSONAL_PRIVATE,
        privacyPolicyVersion: 'people-step6-test',
      },
    });
    const otherHousehold = await prisma.db.household.create({
      data: { createdByUserId: otherMemberId },
    });
    await prisma.db.householdResponsibilityParticipant.create({
      data: {
        householdId: otherHousehold.id,
        responsibilityId: otherResponsibility.id,
        participantUserId: crossHouseholdParticipantId,
        status: HouseholdResponsibilityShareStatus.ACTIVE,
        invitedByUserId: otherMemberId,
        acceptedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    if (responsibilityId) {
      await prisma.db.responsibility.deleteMany({
        where: { principalUserId: { in: createdUserIds } },
      });
    }
    await prisma.db.document.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.db.household.deleteMany({ where: { createdByUserId: { in: createdUserIds } } });
    await prisma.db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await app.close();
  });

  // -------------------------------------------------------------------
  // Golden path: requirement -> submission -> rejection -> supersession ->
  // verification -> completion
  // -------------------------------------------------------------------

  let requirementId: string;
  let firstItemId: string;
  let secondItemId: string;

  it('a member cannot open their own evidence requirement', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ label: 'Proof of current address', description: 'Required for housing eligibility' })
      .expect(403);
  });

  it('an authorized Steward opens an evidence requirement', async () => {
    const res = await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({
        label: 'Proof of current address',
        description: 'Housing assistance requires a current, dated proof of address.',
        requiredValidityDays: 90,
      })
      .expect(201);
    requirementId = res.body.id;
    expect(res.body.status).toBe(EvidenceRequirementStatus.OPEN);
    expect(res.body.currentSufficiency).toBe(EvidenceSufficiencyStatus.MISSING);
    expect(res.body.memberMessage).toMatch(/we still need/i);
  });

  it('reports MISSING before anything is submitted, and blocks completion', async () => {
    const summary = await request(app.getHttpServer())
      .get(`/people/evidence/responsibilities/${responsibilityId}/summary`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(summary.body.aggregateSufficiency).toBe(EvidenceSufficiencyStatus.MISSING);

    await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/attempt-completion`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(409);
  });

  it('the member submits evidence and it reads as received-but-unverified, never done', async () => {
    const documentId = await createOwnedDocument(memberId, 'Lease agreement page 1');
    const res = await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirementId}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ documentId })
      .expect(201);
    firstItemId = res.body.items[res.body.items.length - 1].id;
    expect(res.body.currentSufficiency).toBe(EvidenceSufficiencyStatus.PRESENT_UNVERIFIED);
    expect(res.body.memberMessage).toBe('We received it. This has not been verified yet.');

    await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/attempt-completion`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(409);
  });

  it('an ACTIVE Steward relationship alone does not permit verification', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/items/${firstItemId}/verify`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(403);
  });

  it('a Steward without an ACTIVE relationship is also rejected', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/items/${firstItemId}/verify`)
      .set('Authorization', `Bearer ${unauthorizedStewardToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(403);
  });

  it('the member cannot verify their own evidence, even with a document grant', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/items/${firstItemId}/verify`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(403);
  });

  it('once the member grants document authority, the Steward can reject with a reason', async () => {
    const firstDocumentId = (
      await prisma.db.evidenceItem.findUniqueOrThrow({ where: { id: firstItemId } })
    ).documentId!;
    await grantStewardDocumentRead(memberToken, firstDocumentId);

    const res = await request(app.getHttpServer())
      .post(`/people/evidence/items/${firstItemId}/verify`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({
        result: EvidenceVerificationResult.REJECTED,
        reason: 'This is a lease, not a current proof of address.',
      })
      .expect(201);
    expect(res.body.currentSufficiency).toBe(EvidenceSufficiencyStatus.INSUFFICIENT);
    expect(res.body.memberMessage).toMatch(/doesn.t meet the requirement because/i);
  });

  it('a rejection reason is required', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/items/${firstItemId}/verify`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ result: EvidenceVerificationResult.REJECTED })
      .expect(400);
  });

  it('the member supersedes the rejected item without losing its history', async () => {
    const documentId = await createOwnedDocument(memberId, 'Utility bill, current month');
    const res = await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirementId}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ documentId, supersedesItemId: firstItemId })
      .expect(201);

    const items = res.body.items;
    secondItemId = items[items.length - 1].id;
    const oldItem = items.find((item: { id: string }) => item.id === firstItemId);
    expect(oldItem.status).toBe('SUPERSEDED');
    expect(oldItem.verifications).toHaveLength(1); // prior rejection preserved, never deleted
    expect(res.body.currentSufficiency).toBe(EvidenceSufficiencyStatus.PRESENT_UNVERIFIED);
  });

  it('rejects a second concurrent-style submission that does not name what it supersedes', async () => {
    const documentId = await createOwnedDocument(memberId, 'Another document');
    await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirementId}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ documentId })
      .expect(409);
  });

  it('forged evidence ownership: cannot submit a document owned by someone else', async () => {
    const othersDocumentId = await createOwnedDocument(otherMemberId, "Not the member's document");
    await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirementId}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ documentId: othersDocumentId, supersedesItemId: secondItemId })
      .expect(404);
  });

  it('the authorized Steward verifies the current item and the requirement becomes ADEQUATE', async () => {
    const secondDocumentId = (
      await prisma.db.evidenceItem.findUniqueOrThrow({ where: { id: secondItemId } })
    ).documentId!;
    await grantStewardDocumentRead(memberToken, secondDocumentId);

    const res = await request(app.getHttpServer())
      .post(`/people/evidence/items/${secondItemId}/verify`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(201);
    expect(res.body.currentSufficiency).toBe(EvidenceSufficiencyStatus.ADEQUATE);
    expect(res.body.memberMessage).toMatch(/was checked/i);
  });

  it('the summary endpoint agrees with the requirement-level state (UI/API agreement)', async () => {
    const summary = await request(app.getHttpServer())
      .get(`/people/evidence/responsibilities/${responsibilityId}/summary`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(summary.body.aggregateSufficiency).toBe(EvidenceSufficiencyStatus.ADEQUATE);
    expect(summary.body.message).toBe('We now have the evidence required for this step.');
  });

  it('the completion guard: only now does completion succeed, with genuinely VERIFIED evidence', async () => {
    const res = await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/attempt-completion`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201);
    expect(res.body.status).toBe(ResponsibilityStatus.COMPLETED);

    const events = await prisma.db.responsibilityEvent.findMany({
      where: { responsibilityId, sourceSystem: 'AUREUS_EVIDENCE' },
      orderBy: { occurredAt: 'asc' },
    });
    const verifiedEvidenceEvents = events.filter(
      (event) =>
        event.type === ResponsibilityEventType.ACTION_EVIDENCED &&
        event.evidenceLevel === ResponsibilityEvidenceLevel.VERIFIED,
    );
    expect(verifiedEvidenceEvents.length).toBeGreaterThan(0);
    const completedEvent = await prisma.db.responsibilityEvent.findFirst({
      where: { responsibilityId, type: ResponsibilityEventType.COMPLETED },
    });
    expect(completedEvent).not.toBeNull();
  });

  it('terminal responsibility: the satisfied requirement no longer accepts new evidence', async () => {
    const documentId = await createOwnedDocument(memberId, 'Late document after completion');
    await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirementId}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ documentId, supersedesItemId: secondItemId })
      .expect(409);
  });

  // -------------------------------------------------------------------
  // Cross-tenant / cross-member / cross-household access
  // -------------------------------------------------------------------

  it('IDOR: an unrelated member cannot read the requirement', async () => {
    await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${requirementId}`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .expect(404);
  });

  it('IDOR: an unrelated member cannot read the responsibility evidence summary', async () => {
    await request(app.getHttpServer())
      .get(`/people/evidence/responsibilities/${responsibilityId}/summary`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .expect(404);
  });

  it('an ACTIVE household participant of this exact Responsibility can read, read-only', async () => {
    const res = await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${requirementId}`)
      .set('Authorization', `Bearer ${householdParticipantToken}`)
      .expect(200);
    expect(res.body.id).toBe(requirementId);

    await request(app.getHttpServer())
      .post(`/people/evidence/items/${secondItemId}/verify`)
      .set('Authorization', `Bearer ${householdParticipantToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(403);
  });

  it('a cross-household participant (different household entirely) cannot read', async () => {
    await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${requirementId}`)
      .set('Authorization', `Bearer ${crossHouseholdParticipantToken}`)
      .expect(404);
  });

  it('an administrator can read requirement metadata but never raw document identity', async () => {
    const res = await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${requirementId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.id).toBe(requirementId);
    for (const item of res.body.items) {
      expect(item.documentId).toBeNull();
    }
  });

  it('random UUIDs 404 rather than leaking existence', async () => {
    await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${randomUUID()}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/people/evidence/items/${randomUUID()}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(404);
  });

  // -------------------------------------------------------------------
  // Expiry, waiver, second requirement
  // -------------------------------------------------------------------

  it('expired evidence cannot satisfy current sufficiency, even with a historical VERIFIED row', async () => {
    const secondRequirement = await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ label: 'Proof of income', description: 'Required for eligibility calculation' })
      .expect(201);
    const secondRequirementId = secondRequirement.body.id;

    const documentId = await createOwnedDocument(memberId, 'Pay stub, already stale');
    const submitted = await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${secondRequirementId}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ documentId, validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })
      .expect(201);
    const expiredItemId = submitted.body.items[submitted.body.items.length - 1].id;

    await grantStewardDocumentRead(memberToken, documentId);
    const verified = await request(app.getHttpServer())
      .post(`/people/evidence/items/${expiredItemId}/verify`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(201);

    expect(verified.body.currentSufficiency).toBe(EvidenceSufficiencyStatus.INSUFFICIENT);
    expect(verified.body.memberMessage).toMatch(/expired on/i);

    const verifications = await prisma.db.evidenceVerification.findMany({
      where: { evidenceItemId: expiredItemId },
    });
    expect(verifications).toHaveLength(1);
    expect(verifications[0].result).toBe(EvidenceVerificationResult.VERIFIED); // history is honest: it WAS verified, it is just no longer current
  });

  it('a requirement can be waived by the member, removing it from the aggregate', async () => {
    const requirement = await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ label: 'Proof of household composition', description: 'Not applicable to this case' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirement.body.id}/waive`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ reason: 'Member lives alone; this requirement does not apply.' })
      .expect(201);

    const view = await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${requirement.body.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(view.body.status).toBe(EvidenceRequirementStatus.WAIVED);
    expect(view.body.memberMessage).toMatch(/waived/i);
  });

  // -------------------------------------------------------------------
  // Concurrency: two verifications racing never lose a row
  // -------------------------------------------------------------------

  it('concurrent verification attempts both persist as history, none silently lost', async () => {
    const requirement = await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ label: 'Proof of identity', description: 'Concurrency check fixture' })
      .expect(201);
    const documentId = await createOwnedDocument(memberId, 'ID document');
    const submitted = await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirement.body.id}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ documentId })
      .expect(201);
    const itemId = submitted.body.items[submitted.body.items.length - 1].id;
    await grantStewardDocumentRead(memberToken, documentId);

    const [a, b] = await Promise.allSettled([
      request(app.getHttpServer())
        .post(`/people/evidence/items/${itemId}/verify`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ result: EvidenceVerificationResult.VERIFIED }),
      request(app.getHttpServer())
        .post(`/people/evidence/items/${itemId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          result: EvidenceVerificationResult.FLAGGED_FOR_REVIEW,
          reason: 'Double-checking concurrently.',
        }),
    ]);
    expect(a.status).toBe('fulfilled');
    expect(b.status).toBe('fulfilled');

    const verifications = await prisma.db.evidenceVerification.findMany({
      where: { evidenceItemId: itemId },
    });
    expect(verifications).toHaveLength(2); // both persist; neither is lost
  });
});
