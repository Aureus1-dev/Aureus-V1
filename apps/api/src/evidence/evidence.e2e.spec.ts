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
  Prisma,
  ResponsibilityActorClass,
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

  async function grantAuthority(
    memberToken_: string,
    resourceClass: string,
    resourceRef: string,
    capability: string,
    purpose: string,
  ) {
    const created = await request(app.getHttpServer())
      .post('/authority/requests')
      .set('Authorization', `Bearer ${memberToken_}`)
      .send({
        contextType: 'PERSONAL',
        subjectUserId: memberId,
        capability,
        resourceClass,
        resourceRef,
        purpose,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/authority/requests/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${memberToken_}`)
      .expect(201);
  }

  const grantStewardDocumentRead = (memberToken_: string, documentId: string) =>
    grantAuthority(memberToken_, 'DOCUMENT', documentId, 'READ', 'people-step6-evidence-verification');
  const grantStewardEvidenceRead = (memberToken_: string, responsibilityId_: string) =>
    grantAuthority(memberToken_, 'OTHER', responsibilityId_, 'READ', 'people-step6-evidence-read');
  const grantStewardEvidenceManage = (memberToken_: string, responsibilityId_: string) =>
    grantAuthority(memberToken_, 'OTHER', responsibilityId_, 'WRITE', 'people-step6-evidence-manage');

  /**
   * Deterministic concurrency-race harness (fourth re-review — replaces the
   * fixed-sleep/dispatch-order-assumption approach previously used for the
   * terminal-Responsibility race).
   *
   * `holderMutate` runs inside a real transaction that first takes the same
   * `SELECT ... FOR UPDATE` row lock on the Responsibility that
   * `lockNonTerminalResponsibility()` takes, then WAITS on an explicit
   * release gate before applying its write and committing. The instant the
   * lock query returns, a signal resolves and the test `await`s it before
   * ever issuing the competing HTTP mutation — so the holder is PROVEN to
   * already own the row lock before the competing request is even
   * dispatched. This is the "explicit synchronization barrier" the prior
   * approach lacked: it no longer matters which of two operations "reaches
   * Postgres first" from same-tick dispatch order, because the holder's
   * lock acquisition is confirmed, not assumed, before anything else
   * happens.
   *
   * The competing request is then fired, and a short, generous, explicitly
   * non-safety-critical grace period is given for it to travel through
   * HTTP/Nest/its own pre-transaction reads and reach its own
   * `SELECT ... FOR UPDATE` attempt on the same row — which then genuinely
   * blocks in Postgres (not a timing assumption: the holder has not
   * released yet, guaranteed by the gate) until the holder is released
   * below. If this grace period were too short, the test would merely
   * become less aggressive (the competing request would see already-committed
   * data with no blocking involved) — never incorrect, unlike the previous
   * design's core ambiguity over which side reached Postgres first.
   */
  async function raceAgainstLockedMutation<T>(
    responsibilityId_: string,
    holderMutate: (tx: Prisma.TransactionClient) => Promise<void>,
    fireCompeting: () => Promise<T>,
  ): Promise<T> {
    let signalLockAcquired!: () => void;
    const lockAcquired = new Promise<void>((resolve) => {
      signalLockAcquired = resolve;
    });
    let signalRelease!: () => void;
    const releaseGate = new Promise<void>((resolve) => {
      signalRelease = resolve;
    });

    const holderPromise = prisma.db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`
        SELECT "status" FROM "Responsibility" WHERE "id" = ${responsibilityId_}::uuid FOR UPDATE
      `);
      signalLockAcquired();
      await releaseGate;
      await holderMutate(tx);
    });

    // Proven, not assumed: the holder transaction now owns the row lock.
    await lockAcquired;
    const competingPromise = fireCompeting();
    await new Promise((resolve) => setTimeout(resolve, 300));
    signalRelease();

    const [, competingResult] = await Promise.all([holderPromise, competingPromise]);
    return competingResult;
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
    // household/Responsibility and must never see this one. Both must now
    // receive the not-found boundary from Step 6 regardless (BLOCKER 3):
    // coordination consent is not evidence authority.
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
    await prisma.db.responsibility.deleteMany({
      where: { principalUserId: { in: [...createdUserIds] } },
    });
    await prisma.db.document.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.db.household.deleteMany({ where: { createdByUserId: { in: createdUserIds } } });
    await prisma.db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await app.close();
  });

  // -------------------------------------------------------------------
  // Golden path: requirement -> submission -> rejection -> supersession ->
  // verification -> ADEQUATE (no completion path exists in Step 6)
  // -------------------------------------------------------------------

  let requirementId: string;
  let firstItemId: string;
  let secondItemId: string;

  it('a member cannot open their own evidence requirement (403 — they already know it exists)', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ label: 'Proof of current address', description: 'Required for housing eligibility' })
      .expect(403);
  });

  it('MEDIUM 1 — a genuinely unrelated member gets 404, not 403, for a known-valid Responsibility', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .send({ label: 'Proof of current address', description: 'Probing attempt' })
      .expect(404);
  });

  it('HIGH 2 — an ACTIVE Steward relationship alone does not permit opening a requirement', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ label: 'Proof of current address', description: 'Relationship-only attempt' })
      .expect(403);
  });

  it('an authorized Steward (relationship + Step-2 manage grant) opens an evidence requirement', async () => {
    await grantStewardEvidenceManage(memberToken, responsibilityId);

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
    expect(res.body.cachedSufficiencyAtLastWrite).toBe(EvidenceSufficiencyStatus.MISSING);
    expect(res.body.memberMessage).toMatch(/we still need/i);
  });

  it('reports MISSING before anything is submitted, and there is no completion route left to attempt', async () => {
    const summary = await request(app.getHttpServer())
      .get(`/people/evidence/responsibilities/${responsibilityId}/summary`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(summary.body.aggregateSufficiency).toBe(EvidenceSufficiencyStatus.MISSING);
    expect(summary.body.requirements).toBeDefined();

    // BLOCKER 2 — the prior attempt-completion route no longer exists at all.
    await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/attempt-completion`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(404);
  });

  it('the member submits evidence and it reads as received-but-unverified, never done', async () => {
    const documentId = await createOwnedDocument(memberId, 'Lease agreement page 1');
    const res = await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirementId}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ documentId })
      .expect(201);
    firstItemId = res.body.items[res.body.items.length - 1].id;
    expect(res.body.cachedSufficiencyAtLastWrite).toBe(EvidenceSufficiencyStatus.PRESENT_UNVERIFIED);
    expect(res.body.memberMessage).toBe('We received it. This has not been verified yet.');
  });

  it('HIGH 3 — rejects a submission with a future validFrom', async () => {
    const documentId = await createOwnedDocument(memberId, 'Future-dated document');
    await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirementId}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        documentId,
        supersedesItemId: firstItemId,
        validFrom: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .expect(400);
  });

  it('HIGH 3 — rejects a reversed validity window (validUntil before validFrom)', async () => {
    const documentId = await createOwnedDocument(memberId, 'Reversed window document');
    const validFrom = new Date();
    await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirementId}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        documentId,
        supersedesItemId: firstItemId,
        validFrom: validFrom.toISOString(),
        validUntil: new Date(validFrom.getTime() - 60_000).toISOString(),
      })
      .expect(400);
  });

  it('HIGH 3 — a caller-supplied validUntil cannot exceed the requirement\'s requiredValidityDays window', async () => {
    const documentId = await createOwnedDocument(memberId, 'Over-long validity document');
    await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirementId}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        documentId,
        supersedesItemId: firstItemId,
        // requiredValidityDays is 90 on this requirement; ~2 years exceeds it.
        validUntil: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .expect(400);
  });

  it('HIGH 2 — an ACTIVE Steward relationship alone does not permit verification', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/items/${firstItemId}/verify`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(403);
  });

  it('MEDIUM 1 — a Steward with no relationship at all gets 404, not 403, for a known-valid item', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/items/${firstItemId}/verify`)
      .set('Authorization', `Bearer ${unauthorizedStewardToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(404);
  });

  it('MEDIUM 1 — a genuinely unrelated member gets 404, not 403, for a known-valid item', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/items/${firstItemId}/verify`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(404);
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
    expect(res.body.cachedSufficiencyAtLastWrite).toBe(EvidenceSufficiencyStatus.INSUFFICIENT);
    expect(res.body.memberMessage).toMatch(/doesn.t meet the requirement because/i);
  });

  it('HIGH 5 — a REJECTED verification still emits a truthful ResponsibilityEvent', async () => {
    const events = await prisma.db.responsibilityEvent.findMany({
      where: { responsibilityId, sourceRecordId: firstItemId, sourceState: 'REJECTED' },
    });
    expect(events).toHaveLength(1);
    expect(events[0].evidenceLevel).toBe(ResponsibilityEvidenceLevel.REPORTED);
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
    expect(res.body.cachedSufficiencyAtLastWrite).toBe(EvidenceSufficiencyStatus.PRESENT_UNVERIFIED);
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
    expect(res.body.cachedSufficiencyAtLastWrite).toBe(EvidenceSufficiencyStatus.ADEQUATE);
    expect(res.body.memberMessage).toMatch(/was checked/i);
  });

  it('MEDIUM 2 — the full view truthfully attributes who supplied and who verified, without mislabeling SYSTEM', async () => {
    const view = await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${requirementId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const current = view.body.items.find((item: { id: string }) => item.id === secondItemId);
    expect(current.providedByUserId).toBe(memberId);
    expect(current.providedByActorClass).toBe(ResponsibilityActorClass.MEMBER);
    const verification = current.verifications[current.verifications.length - 1];
    expect(verification.performedByUserId).toBe(stewardId);
    // actorClass remains the shared ledger's SYSTEM convention for a
    // staff-mediated action, but performedByUserId now truthfully names the
    // human — the view is never required to claim SYSTEM performed the act,
    // only that the shared actorClass vocabulary is unchanged.
    expect(verification.actorClass).toBe(ResponsibilityActorClass.SYSTEM);
  });

  it('the summary endpoint agrees with the requirement-level state (UI/API agreement)', async () => {
    const summary = await request(app.getHttpServer())
      .get(`/people/evidence/responsibilities/${responsibilityId}/summary`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(summary.body.aggregateSufficiency).toBe(EvidenceSufficiencyStatus.ADEQUATE);
    expect(summary.body.message).toBe('We now have the evidence required for this step.');
  });

  it('BLOCKER 2 — full ADEQUATE evidence does not itself complete or terminalize the Responsibility, and no attempt-completion route exists', async () => {
    await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/attempt-completion`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(404);

    const stored = await prisma.db.responsibility.findUniqueOrThrow({
      where: { id: responsibilityId },
    });
    expect(stored.status).toBe(ResponsibilityStatus.ACTIVE);
    expect(stored.completedAt).toBeNull();
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

  it('BLOCKER 3 — an ACTIVE household participant of this exact Responsibility gets the not-found boundary, never the evidence view', async () => {
    await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${requirementId}`)
      .set('Authorization', `Bearer ${householdParticipantToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/people/evidence/responsibilities/${responsibilityId}/summary`)
      .set('Authorization', `Bearer ${householdParticipantToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/people/evidence/items/${secondItemId}/verify`)
      .set('Authorization', `Bearer ${householdParticipantToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(404);
  });

  it('a cross-household participant (different household entirely) cannot read', async () => {
    await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${requirementId}`)
      .set('Authorization', `Bearer ${crossHouseholdParticipantToken}`)
      .expect(404);
  });

  it('BLOCKER 4 / BLOCKER 1 (2nd re-review) — the assigned Steward, relationship only, gets the not-found boundary everywhere, including summary', async () => {
    // The Steward has an ACTIVE relationship but only ever received a
    // per-document verification grant and a manage grant above — never a
    // Step-2 evidence-READ grant for this Responsibility. An aggregate
    // evidentiary judgment (ADEQUATE/INSUFFICIENT + its truthful message) is
    // itself private Responsibility evidence, so there is no lesser "minimal
    // projection" fallback here either — the independent re-review correctly
    // identified the prior minimal-summary fallback as still leaking
    // evidence.
    await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${requirementId}`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/people/evidence/responsibilities/${responsibilityId}/summary`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .expect(404);
  });

  it('BLOCKER 4 — once the member grants an explicit Step-2 evidence-read authority, the Steward receives full detail', async () => {
    await grantStewardEvidenceRead(memberToken, responsibilityId);

    const full = await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${requirementId}`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .expect(200);
    expect(full.body.id).toBe(requirementId);

    const summary = await request(app.getHttpServer())
      .get(`/people/evidence/responsibilities/${responsibilityId}/summary`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .expect(200);
    expect(summary.body.requirements).toBeDefined();
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
  // HIGH 4 — independent verification is not independent of the provider
  // -------------------------------------------------------------------

  it('HIGH 4 — an administrator cannot submit evidence and then verify their own submission', async () => {
    const requirement = await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Proof of Social Security eligibility', description: 'Admin self-verify probe' })
      .expect(201);

    const documentId = await createOwnedDocument(adminId, "Admin's own submitted document");
    const submitted = await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirement.body.id}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ documentId })
      .expect(201);
    const itemId = submitted.body.items[submitted.body.items.length - 1].id;
    expect(submitted.body.items[submitted.body.items.length - 1].providedByUserId).toBe(adminId);

    await request(app.getHttpServer())
      .post(`/people/evidence/items/${itemId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(403);

    // A different administrator (or the assigned Steward, once independent)
    // can still verify it — the block is specifically self-provided, not
    // "no admin can ever verify this item."
    const otherAdmin = await createUser('admin-second', [UserRole.PLATFORM_ADMINISTRATOR]);
    const verified = await request(app.getHttpServer())
      .post(`/people/evidence/items/${itemId}/verify`)
      .set('Authorization', `Bearer ${otherAdmin.token}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(201);
    expect(verified.body.cachedSufficiencyAtLastWrite).toBe(EvidenceSufficiencyStatus.ADEQUATE);
  });

  // -------------------------------------------------------------------
  // HIGH 1 — waiver authority: request vs. authoritative decision
  // -------------------------------------------------------------------

  it('HIGH 1 — a member can only request a waiver; it stays active in the aggregate until an administrator decides', async () => {
    const requirement = await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ label: 'Proof of household composition', description: 'Not applicable to this case' })
      .expect(201);

    const requested = await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirement.body.id}/waive`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ reason: 'Member lives alone; this requirement does not apply.' })
      .expect(201);
    expect(requested.body.status).toBe(EvidenceRequirementStatus.WAIVER_REQUESTED);
    // A mere request is never authoritative-decision provenance.
    expect(requested.body.waivedByUserId).toBeNull();
    expect(requested.body.waiverRequestedByUserId).toBe(memberId);
    expect(requested.body.waiverRequestedReason).toBe(
      'Member lives alone; this requirement does not apply.',
    );
    expect(requested.body.waiverRequestedAt).not.toBeNull();
    expect(requested.body.memberMessage).toMatch(/pending administrator review/i);

    // A mere request must not remove the requirement from aggregate
    // sufficiency (prior HIGH finding) — it is still MISSING, so the
    // aggregate for this Responsibility must reflect that.
    const summary = await request(app.getHttpServer())
      .get(`/people/evidence/responsibilities/${responsibilityId}/summary`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const stillActive = summary.body.requirements.find(
      (r: { id: string }) => r.id === requirement.body.id,
    );
    expect(stillActive.liveSufficiency).toBe(EvidenceSufficiencyStatus.MISSING);
    expect(summary.body.aggregateSufficiency).not.toBe(EvidenceSufficiencyStatus.ADEQUATE);

    // The member cannot request a second time or otherwise re-waive it.
    await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirement.body.id}/waive`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ reason: 'Trying again.' })
      .expect(409);

    // Only an administrator can turn the request into an authoritative
    // waiver, and only then is it excluded from the aggregate.
    const decided = await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirement.body.id}/waive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Confirmed: member has no household to document.' })
      .expect(201);
    expect(decided.body.status).toBe(EvidenceRequirementStatus.WAIVED);
    expect(decided.body.waivedByUserId).toBe(adminId);
    expect(decided.body.waivedReason).toBe('Confirmed: member has no household to document.');
    // HIGH (2nd re-review) — the administrator's authoritative decision must
    // never overwrite the original request's who/why/when.
    expect(decided.body.waiverRequestedByUserId).toBe(memberId);
    expect(decided.body.waiverRequestedReason).toBe(
      'Member lives alone; this requirement does not apply.',
    );
    expect(decided.body.waiverRequestedAt).toBe(requested.body.waiverRequestedAt);

    const events = await prisma.db.responsibilityEvent.findMany({
      where: {
        responsibilityId,
        sourceRecordId: requirement.body.id,
        sourceState: { in: ['WAIVER_REQUESTED', 'WAIVED'] },
      },
    });
    expect(events.map((e) => e.sourceState).sort()).toEqual(['WAIVED', 'WAIVER_REQUESTED']);
  });

  it('an administrator can waive an OPEN requirement directly, with no prior request', async () => {
    const requirement = await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Proof of citizenship status', description: 'Admin-direct waiver fixture' })
      .expect(201);

    const decided = await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirement.body.id}/waive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Not applicable to this housing program.' })
      .expect(201);
    expect(decided.body.status).toBe(EvidenceRequirementStatus.WAIVED);
  });

  // -------------------------------------------------------------------
  // Expiry & time-based truth (MEDIUM 3)
  // -------------------------------------------------------------------

  it('expired evidence cannot satisfy current sufficiency, even with a historical VERIFIED row', async () => {
    const secondRequirement = await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ label: 'Proof of income', description: 'Required for eligibility calculation' })
      .expect(201);
    const secondRequirementId = secondRequirement.body.id;

    const documentId = await createOwnedDocument(memberId, 'Pay stub, already stale');
    const validFrom = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    const submitted = await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${secondRequirementId}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        documentId,
        validFrom: validFrom.toISOString(),
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      })
      .expect(201);
    const expiredItemId = submitted.body.items[submitted.body.items.length - 1].id;

    await grantStewardDocumentRead(memberToken, documentId);
    const verified = await request(app.getHttpServer())
      .post(`/people/evidence/items/${expiredItemId}/verify`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(201);

    expect(verified.body.cachedSufficiencyAtLastWrite).toBe(EvidenceSufficiencyStatus.INSUFFICIENT);
    expect(verified.body.liveSufficiency).toBe(EvidenceSufficiencyStatus.INSUFFICIENT);
    expect(verified.body.memberMessage).toMatch(/expired on/i);

    const verifications = await prisma.db.evidenceVerification.findMany({
      where: { evidenceItemId: expiredItemId },
    });
    expect(verifications).toHaveLength(1);
    expect(verifications[0].result).toBe(EvidenceVerificationResult.VERIFIED); // history is honest: it WAS verified, it is just no longer current
  });

  it('MEDIUM 3 — cachedSufficiencyAtLastWrite can lag liveSufficiency after time-based expiry with no new write', async () => {
    const requirement = await request(app.getHttpServer())
      .post(`/people/evidence/responsibilities/${responsibilityId}/requirements`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ label: 'Proof expiring imminently', description: 'Time-staleness fixture' })
      .expect(201);

    const documentId = await createOwnedDocument(memberId, 'Soon-to-expire document');
    const submitted = await request(app.getHttpServer())
      .post(`/people/evidence/requirements/${requirement.body.id}/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ documentId, validUntil: new Date(Date.now() + 1200).toISOString() })
      .expect(201);
    const itemId = submitted.body.items[submitted.body.items.length - 1].id;

    await grantStewardDocumentRead(memberToken, documentId);
    const verified = await request(app.getHttpServer())
      .post(`/people/evidence/items/${itemId}/verify`)
      .set('Authorization', `Bearer ${stewardToken}`)
      .send({ result: EvidenceVerificationResult.VERIFIED })
      .expect(201);
    // At the moment of the write, both are ADEQUATE.
    expect(verified.body.cachedSufficiencyAtLastWrite).toBe(EvidenceSufficiencyStatus.ADEQUATE);
    expect(verified.body.liveSufficiency).toBe(EvidenceSufficiencyStatus.ADEQUATE);

    await new Promise((resolve) => setTimeout(resolve, 1800));

    const stale = await request(app.getHttpServer())
      .get(`/people/evidence/requirements/${requirement.body.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    // Time passed with no write: the cache still reads ADEQUATE, but live
    // truth has moved on. No consumer may mistake the cache for current
    // truth — the Step-5 seam (responsibilitySummary) always uses live.
    expect(stale.body.cachedSufficiencyAtLastWrite).toBe(EvidenceSufficiencyStatus.ADEQUATE);
    expect(stale.body.liveSufficiency).toBe(EvidenceSufficiencyStatus.INSUFFICIENT);

    const summary = await request(app.getHttpServer())
      .get(`/people/evidence/responsibilities/${responsibilityId}/summary`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(summary.body.aggregateSufficiency).not.toBe(EvidenceSufficiencyStatus.ADEQUATE);
  });

  // -------------------------------------------------------------------
  // BLOCKER 5 — terminal Responsibilities are no longer evidence-mutable
  // -------------------------------------------------------------------

  describe('BLOCKER 5 — terminal Responsibility guard', () => {
    it.each([
      ResponsibilityStatus.COMPLETED,
      ResponsibilityStatus.CANCELLED,
      ResponsibilityStatus.RESPONSIBLY_EXHAUSTED,
    ])('rejects every evidence-truth mutation once the Responsibility is %s', async (terminalStatus) => {
      const terminal = await prisma.db.responsibility.create({
        data: {
          kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
          objective: `Terminal fixture for ${terminalStatus}`,
          status: ResponsibilityStatus.ACTIVE,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId: memberId,
          originConversationId: randomUUID(),
          successCriteria: { type: 'PERSONAL_NEED_RESOLUTION', statedNeedId: randomUUID() },
          authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
          authorityPolicyVersion: 'people-step6-test',
          privacyScope: ResponsibilityPrivacyScope.PERSONAL_PRIVATE,
          privacyPolicyVersion: 'people-step6-test',
        },
      });

      // Open a requirement and submit+verify evidence WHILE still ACTIVE, so
      // there is a real item to attempt (and fail) to re-verify/re-waive
      // once terminal.
      const requirement = await prisma.db.evidenceRequirement.create({
        data: {
          responsibilityId: terminal.id,
          subjectUserId: memberId,
          label: 'Pre-terminal requirement',
          description: 'Exists before the Responsibility becomes terminal',
          createdByUserId: adminId,
        },
      });
      const documentId = await createOwnedDocument(memberId, `Pre-terminal doc ${terminalStatus}`);
      const item = await prisma.db.evidenceItem.create({
        data: {
          requirementId: requirement.id,
          documentId,
          origin: 'MEMBER_PROVIDED',
          providedByUserId: memberId,
          providedByActorClass: 'MEMBER',
        },
      });

      await prisma.db.responsibility.update({
        where: { id: terminal.id },
        data: {
          status: terminalStatus,
          completedAt: terminalStatus === ResponsibilityStatus.COMPLETED ? new Date() : null,
        },
      });

      const requirementCountBefore = await prisma.db.evidenceRequirement.count({
        where: { responsibilityId: terminal.id },
      });
      const eventCountBefore = await prisma.db.responsibilityEvent.count({
        where: { responsibilityId: terminal.id },
      });

      await request(app.getHttpServer())
        .post(`/people/evidence/responsibilities/${terminal.id}/requirements`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ label: 'Too late', description: 'Should be rejected' })
        .expect(409);

      await grantStewardDocumentRead(memberToken, documentId);
      await request(app.getHttpServer())
        .post(`/people/evidence/requirements/${requirement.id}/items`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ documentId: await createOwnedDocument(memberId, 'Too-late submission'), supersedesItemId: item.id })
        .expect(409);

      await request(app.getHttpServer())
        .post(`/people/evidence/items/${item.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ result: EvidenceVerificationResult.VERIFIED })
        .expect(409);

      await request(app.getHttpServer())
        .post(`/people/evidence/requirements/${requirement.id}/waive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Too late' })
        .expect(409);

      // Reads still work.
      await request(app.getHttpServer())
        .get(`/people/evidence/requirements/${requirement.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const requirementCountAfter = await prisma.db.evidenceRequirement.count({
        where: { responsibilityId: terminal.id },
      });
      const eventCountAfter = await prisma.db.responsibilityEvent.count({
        where: { responsibilityId: terminal.id },
      });
      expect(requirementCountAfter).toBe(requirementCountBefore);
      expect(eventCountAfter).toBe(eventCountBefore);
      const unchangedItem = await prisma.db.evidenceItem.findUniqueOrThrow({
        where: { id: item.id },
      });
      expect(unchangedItem.status).toBe('SUBMITTED');
      const verificationCount = await prisma.db.evidenceVerification.count({
        where: { evidenceItemId: item.id },
      });
      expect(verificationCount).toBe(0);
    });

    it('BLOCKER 2 (2nd re-review) — a terminal transition racing a Step-6 mutation cannot leave a post-terminal Evidence row', async () => {
      const raceResponsibility = await prisma.db.responsibility.create({
        data: {
          kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
          objective: 'Race fixture — concurrent terminalization vs. submitItem',
          status: ResponsibilityStatus.ACTIVE,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId: memberId,
          originConversationId: randomUUID(),
          successCriteria: { type: 'PERSONAL_NEED_RESOLUTION', statedNeedId: randomUUID() },
          authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
          authorityPolicyVersion: 'people-step6-test',
          privacyScope: ResponsibilityPrivacyScope.PERSONAL_PRIVATE,
          privacyPolicyVersion: 'people-step6-test',
        },
      });
      const raceRequirement = await prisma.db.evidenceRequirement.create({
        data: {
          responsibilityId: raceResponsibility.id,
          subjectUserId: memberId,
          label: 'Race requirement',
          description: 'Exists before the concurrent terminalization',
          createdByUserId: adminId,
        },
      });
      const documentId = await createOwnedDocument(memberId, 'Race document');

      // Directly simulate "another governed path" terminalizing this exact
      // Responsibility, using the deterministic barrier harness (fourth
      // re-review — replaces the fixed ~500ms sleep and same-tick dispatch
      // assumption previously used here).
      const submitResponse = await raceAgainstLockedMutation(
        raceResponsibility.id,
        async (tx) => {
          await tx.responsibility.update({
            where: { id: raceResponsibility.id },
            data: { status: ResponsibilityStatus.COMPLETED, completedAt: new Date() },
          });
        },
        () =>
          request(app.getHttpServer())
            .post(`/people/evidence/requirements/${raceRequirement.id}/items`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send({ documentId }),
      );

      // lockNonTerminalResponsibility() must have blocked on the same row
      // lock until the terminalizing transaction committed, then observed
      // the now-COMPLETED status and rejected the submission — not raced
      // past it using a stale pre-transaction read.
      expect(submitResponse.status).toBe(409);
      const itemCount = await prisma.db.evidenceItem.count({
        where: { requirementId: raceRequirement.id },
      });
      expect(itemCount).toBe(0);
      const eventCount = await prisma.db.responsibilityEvent.count({
        where: { responsibilityId: raceResponsibility.id, sourceRecordType: 'EvidenceItem' },
      });
      expect(eventCount).toBe(0);
      const finalStatus = await prisma.db.responsibility.findUniqueOrThrow({
        where: { id: raceResponsibility.id },
        select: { status: true },
      });
      expect(finalStatus.status).toBe(ResponsibilityStatus.COMPLETED);
    });
  });

  // -------------------------------------------------------------------
  // Fourth re-review — subordinate Requirement/Item state-machine checks
  // must also live inside the serialization boundary, not just the
  // Responsibility-level terminal guard above.
  // -------------------------------------------------------------------

  describe('Fourth re-review — Requirement/Item state races behind the Responsibility lock', () => {
    async function createRaceFixture(objective: string) {
      const raceResponsibility = await prisma.db.responsibility.create({
        data: {
          kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
          objective,
          status: ResponsibilityStatus.ACTIVE,
          contextType: ResponsibilityContextType.PERSONAL,
          principalUserId: memberId,
          originConversationId: randomUUID(),
          successCriteria: { type: 'PERSONAL_NEED_RESOLUTION', statedNeedId: randomUUID() },
          authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
          authorityPolicyVersion: 'people-step6-test',
          privacyScope: ResponsibilityPrivacyScope.PERSONAL_PRIVATE,
          privacyPolicyVersion: 'people-step6-test',
        },
      });
      const raceRequirement = await prisma.db.evidenceRequirement.create({
        data: {
          responsibilityId: raceResponsibility.id,
          subjectUserId: memberId,
          label: 'Race requirement',
          description: 'Fourth re-review state-machine race fixture',
          createdByUserId: adminId,
        },
      });
      return { raceResponsibility, raceRequirement };
    }

    it('Race A — an administrative waiver racing a member waiver request can never be reverted back to WAIVER_REQUESTED', async () => {
      const { raceResponsibility, raceRequirement } = await createRaceFixture(
        'Race fixture — admin WAIVED vs. member WAIVER_REQUESTED',
      );

      const memberResponse = await raceAgainstLockedMutation(
        raceResponsibility.id,
        async (tx) => {
          await tx.evidenceRequirement.update({
            where: { id: raceRequirement.id },
            data: {
              status: EvidenceRequirementStatus.WAIVED,
              waivedByUserId: adminId,
              waivedReason: 'Administrator decided first (race fixture)',
              waivedAt: new Date(),
            },
          });
          await tx.responsibilityEvent.create({
            data: {
              responsibilityId: raceResponsibility.id,
              type: ResponsibilityEventType.ACTION_EVIDENCED,
              actorClass: ResponsibilityActorClass.SYSTEM,
              sourceSystem: 'AUREUS_EVIDENCE',
              sourceRecordType: 'EvidenceRequirement',
              sourceRecordId: raceRequirement.id,
              sourceState: EvidenceRequirementStatus.WAIVED,
              evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
            },
          });
        },
        () =>
          request(app.getHttpServer())
            .post(`/people/evidence/requirements/${raceRequirement.id}/waive`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send({ reason: 'Member request racing the admin decision (race fixture)' }),
      );

      // The stale member request — reading OPEN before the admin's decision
      // committed — must fail once it finally gets the lock and re-reads
      // the now-WAIVED truth, not silently revert it to WAIVER_REQUESTED.
      expect(memberResponse.status).toBe(409);

      const finalRequirement = await prisma.db.evidenceRequirement.findUniqueOrThrow({
        where: { id: raceRequirement.id },
      });
      expect(finalRequirement.status).toBe(EvidenceRequirementStatus.WAIVED);
      // Authoritative decision provenance survives untouched.
      expect(finalRequirement.waivedByUserId).toBe(adminId);
      expect(finalRequirement.waivedReason).toBe('Administrator decided first (race fixture)');
      expect(finalRequirement.waivedAt).not.toBeNull();
      // The rejected, stale member request must never have written anything.
      expect(finalRequirement.waiverRequestedByUserId).toBeNull();
      expect(finalRequirement.waiverRequestedReason).toBeNull();
      expect(finalRequirement.waiverRequestedAt).toBeNull();

      const events = await prisma.db.responsibilityEvent.findMany({
        where: { responsibilityId: raceResponsibility.id, sourceRecordId: raceRequirement.id },
      });
      // Exactly the admin's WAIVED event — no invalid WAIVER_REQUESTED event
      // from the stale, rejected member request.
      expect(events).toHaveLength(1);
      expect(events[0].sourceState).toBe(EvidenceRequirementStatus.WAIVED);
    });

    it('Race B — an administrative waiver racing a real evidence submission leaves no new EvidenceItem', async () => {
      const { raceResponsibility, raceRequirement } = await createRaceFixture(
        'Race fixture — admin WAIVED vs. submitItem',
      );
      const documentId = await createOwnedDocument(memberId, 'Race B document');

      const submitResponse = await raceAgainstLockedMutation(
        raceResponsibility.id,
        async (tx) => {
          await tx.evidenceRequirement.update({
            where: { id: raceRequirement.id },
            data: {
              status: EvidenceRequirementStatus.WAIVED,
              waivedByUserId: adminId,
              waivedReason: 'Administrator waived while a submission was in flight (race fixture)',
              waivedAt: new Date(),
            },
          });
          await tx.responsibilityEvent.create({
            data: {
              responsibilityId: raceResponsibility.id,
              type: ResponsibilityEventType.ACTION_EVIDENCED,
              actorClass: ResponsibilityActorClass.SYSTEM,
              sourceSystem: 'AUREUS_EVIDENCE',
              sourceRecordType: 'EvidenceRequirement',
              sourceRecordId: raceRequirement.id,
              sourceState: EvidenceRequirementStatus.WAIVED,
              evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
            },
          });
        },
        () =>
          request(app.getHttpServer())
            .post(`/people/evidence/requirements/${raceRequirement.id}/items`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send({ documentId }),
      );

      // Stale pre-lock OPEN read must not survive the wait for the lock.
      expect(submitResponse.status).toBe(409);

      const finalRequirement = await prisma.db.evidenceRequirement.findUniqueOrThrow({
        where: { id: raceRequirement.id },
      });
      expect(finalRequirement.status).toBe(EvidenceRequirementStatus.WAIVED);

      const itemCount = await prisma.db.evidenceItem.count({
        where: { requirementId: raceRequirement.id },
      });
      expect(itemCount).toBe(0);

      const submittedEventCount = await prisma.db.responsibilityEvent.count({
        where: {
          responsibilityId: raceResponsibility.id,
          sourceRecordType: 'EvidenceItem',
          sourceState: 'SUBMITTED',
        },
      });
      expect(submittedEventCount).toBe(0);
    });

    it('Race C — verifying an item racing its own supersession cannot attach a verification to the superseded item', async () => {
      const { raceResponsibility, raceRequirement } = await createRaceFixture(
        'Race fixture — item SUPERSEDED vs. verifyItem',
      );
      const oldDocumentId = await createOwnedDocument(memberId, 'Race C old document');
      const oldItem = await prisma.db.evidenceItem.create({
        data: {
          requirementId: raceRequirement.id,
          documentId: oldDocumentId,
          origin: 'MEMBER_PROVIDED',
          providedByUserId: memberId,
          providedByActorClass: 'MEMBER',
        },
      });
      const replacementDocumentId = await createOwnedDocument(memberId, 'Race C replacement document');

      const verifyResponse = await raceAgainstLockedMutation(
        raceResponsibility.id,
        async (tx) => {
          const claimed = await tx.evidenceItem.updateMany({
            where: { id: oldItem.id, status: 'SUBMITTED' },
            data: { status: 'SUPERSEDED' },
          });
          if (claimed.count !== 1) {
            throw new Error('race fixture setup invariant violated: old item was not SUBMITTED');
          }
          const replacement = await tx.evidenceItem.create({
            data: {
              requirementId: raceRequirement.id,
              documentId: replacementDocumentId,
              origin: 'MEMBER_PROVIDED',
              providedByUserId: memberId,
              providedByActorClass: 'MEMBER',
              supersedesItemId: oldItem.id,
            },
          });
          await tx.responsibilityEvent.create({
            data: {
              responsibilityId: raceResponsibility.id,
              type: ResponsibilityEventType.ACTION_EVIDENCED,
              actorClass: ResponsibilityActorClass.SYSTEM,
              sourceSystem: 'AUREUS_EVIDENCE',
              sourceRecordType: 'EvidenceItem',
              sourceRecordId: replacement.id,
              sourceState: 'SUBMITTED',
              evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
            },
          });
        },
        () =>
          request(app.getHttpServer())
            .post(`/people/evidence/items/${oldItem.id}/verify`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ result: EvidenceVerificationResult.VERIFIED }),
      );

      // The stale pre-lock SUBMITTED read must not survive the wait for the
      // lock the real supersession transaction took first.
      expect(verifyResponse.status).toBe(409);

      const finalOldItem = await prisma.db.evidenceItem.findUniqueOrThrow({
        where: { id: oldItem.id },
      });
      expect(finalOldItem.status).toBe('SUPERSEDED');

      const verificationCount = await prisma.db.evidenceVerification.count({
        where: { evidenceItemId: oldItem.id },
      });
      expect(verificationCount).toBe(0);

      const invalidVerifiedEventCount = await prisma.db.responsibilityEvent.count({
        where: {
          responsibilityId: raceResponsibility.id,
          sourceRecordId: oldItem.id,
          sourceState: 'VERIFIED',
        },
      });
      expect(invalidVerifiedEventCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // Step 5 / Step 6 integration seam (post-Step-5-merge reconciliation)
  // -------------------------------------------------------------------

  describe('Step 5 / Step 6 boundary — evidence adequacy never completes the life need', () => {
    it('ADEQUATE Step-6 evidence plus a SATISFIED_VERIFIED Step-5 Obligation still leaves the Personal Need Responsibility open', async () => {
      const conversation = await request(app.getHttpServer())
        .post('/ai/conversations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Step 5/6 boundary proof' })
        .expect(201);
      const need = await prisma.db.statedNeed.create({
        data: {
          userId: memberId,
          conversationId: conversation.body.id,
          content: 'I need housing help finding an apartment and keeping the paperwork straight.',
        },
      });
      const accepted = await request(app.getHttpServer())
        .post('/people/resolutions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ statedNeedId: need.id, objective: 'Help me get into appropriate housing' })
        .expect(201);
      const boundaryResponsibilityId = accepted.body.responsibility.id;

      // Step 5: record and independently verify a housing Obligation through
      // to SATISFIED_VERIFIED, using the real merged Step-5 implementation.
      const obligation = await request(app.getHttpServer())
        .post(`/people/follow-through/${boundaryResponsibilityId}/housing`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          kind: 'DEADLINE',
          owner: 'AUREUS',
          requiredAction: 'Submit the housing application packet',
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          dueTimeZone: 'America/New_York',
        })
        .expect(201);

      const reported = await request(app.getHttpServer())
        .post(`/people/follow-through/${boundaryResponsibilityId}/satisfaction-report`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ expectedRevision: obligation.body.revision, note: 'Submitted the packet.' })
        .expect(201);

      const obligationVerified = await request(app.getHttpServer())
        .post(`/people/follow-through/${boundaryResponsibilityId}/satisfaction-verification`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({
          expectedRevision: reported.body.revision,
          sourceSystem: 'HOUSING_PROVIDER',
          sourceRecordType: 'ApplicationReceipt',
          sourceRecordId: `receipt-${randomUUID()}`,
          sourceState: 'RECEIVED',
        })
        .expect(201);
      expect(obligationVerified.body.state).toBe('SATISFIED_VERIFIED');

      // Step 6: independently bring every evidence requirement on the SAME
      // Responsibility to ADEQUATE.
      await grantStewardEvidenceManage(memberToken, boundaryResponsibilityId);
      const requirement = await request(app.getHttpServer())
        .post(`/people/evidence/responsibilities/${boundaryResponsibilityId}/requirements`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ label: 'Proof of housing application submission', description: 'Boundary proof' })
        .expect(201);
      const documentId = await createOwnedDocument(memberId, 'Application confirmation');
      const submitted = await request(app.getHttpServer())
        .post(`/people/evidence/requirements/${requirement.body.id}/items`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ documentId })
        .expect(201);
      const itemId = submitted.body.items[submitted.body.items.length - 1].id;
      await grantStewardDocumentRead(memberToken, documentId);
      const verifiedEvidence = await request(app.getHttpServer())
        .post(`/people/evidence/items/${itemId}/verify`)
        .set('Authorization', `Bearer ${stewardToken}`)
        .send({ result: EvidenceVerificationResult.VERIFIED })
        .expect(201);
      expect(verifiedEvidence.body.cachedSufficiencyAtLastWrite).toBe(
        EvidenceSufficiencyStatus.ADEQUATE,
      );

      const evidenceSummary = await request(app.getHttpServer())
        .get(`/people/evidence/responsibilities/${boundaryResponsibilityId}/summary`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(evidenceSummary.body.aggregateSufficiency).toBe(EvidenceSufficiencyStatus.ADEQUATE);

      // The underlying Personal Need Responsibility remains open. Neither
      // Step 5's SATISFIED_VERIFIED Obligation nor Step 6's ADEQUATE
      // evidence — separately or together — completes it. Only the existing
      // source-domain outcome boundary Step 1 owns could ever do that, and
      // this test deliberately never calls it.
      const stored = await prisma.db.responsibility.findUniqueOrThrow({
        where: { id: boundaryResponsibilityId },
      });
      expect(stored.status).not.toBe(ResponsibilityStatus.COMPLETED);
      expect(stored.status).not.toBe(ResponsibilityStatus.RESPONSIBLY_EXHAUSTED);
      expect(stored.completedAt).toBeNull();

      // There is no attempt-completion route left for Step 6 to expose.
      await request(app.getHttpServer())
        .post(`/people/evidence/responsibilities/${boundaryResponsibilityId}/attempt-completion`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(404);
    });
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

    const events = await prisma.db.responsibilityEvent.findMany({
      where: {
        responsibilityId,
        sourceRecordId: itemId,
        sourceState: { in: ['VERIFIED', 'FLAGGED_FOR_REVIEW'] },
      },
    });
    // HIGH 5 — both VERIFIED and FLAGGED_FOR_REVIEW are meaningful,
    // separately emitted transitions on the shared ledger (in addition to
    // the earlier SUBMITTED event from creating the item itself).
    expect(events.map((e) => e.sourceState).sort()).toEqual(['FLAGGED_FOR_REVIEW', 'VERIFIED']);
  });
});
