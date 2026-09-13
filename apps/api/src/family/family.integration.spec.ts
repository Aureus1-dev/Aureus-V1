import { randomUUID } from 'crypto';
import {
  GovernedWorkForm,
  GovernedWorkSourceType,
  GovernedWorkStakeType,
  ParentChildRelationshipStatus,
  ResponsibilityKind,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaResponsibilityRepository } from '../responsibilities/repositories/prisma-responsibility.repository';
import { FamilyService } from './family.service';
import { WorkContractService } from './work-contract.service';

function caller(id: string): AuthenticatedUser {
  return { id, email: `${id}@example.test`, roles: ['MEMBER'] };
}

describe('Parent + Child PC-001 — Prisma integration', () => {
  let prisma: PrismaService;
  let family: FamilyService;
  let contracts: WorkContractService;
  let responsibilities: PrismaResponsibilityRepository;
  let guardianId: string;
  let childId: string;
  let outsiderId: string;

  const marker = `pc001-${randomUUID()}`;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    family = new FamilyService(prisma);
    contracts = new WorkContractService(prisma, family);
    responsibilities = new PrismaResponsibilityRepository(prisma);

    const guardian = await prisma.db.user.create({ data: { email: `guardian-${marker}@example.test` } });
    const child = await prisma.db.user.create({ data: { email: `child-${marker}@example.test` } });
    const outsider = await prisma.db.user.create({ data: { email: `outsider-${marker}@example.test` } });
    guardianId = guardian.id;
    childId = child.id;
    outsiderId = outsider.id;
    await prisma.db.profile.create({ data: { userId: childId, displayName: 'PC-001 Child' } });
  });

  afterAll(async () => {
    await prisma.db.user.deleteMany({ where: { id: { in: [guardianId, childId, outsiderId] } } });
    await prisma.onModuleDestroy();
  });

  it('requires guardian attestation plus affirmative child assent before authority is active', async () => {
    const proposed = await family.proposeRelationship(childId, caller(guardianId));
    expect(proposed.status).toBe(ParentChildRelationshipStatus.PENDING);
    expect(proposed.guardianAttestedAt).toBeInstanceOf(Date);
    expect(proposed.childAssentedAt).toBeNull();

    await expect(family.requireActiveRelationship(guardianId, childId)).rejects.toThrow();
    const assented = await family.assentRelationship(proposed.id, caller(childId));
    expect(assented.status).toBe(ParentChildRelationshipStatus.ACTIVE);
    expect(assented.childAssentedAt).toBeInstanceOf(Date);

    const children = await family.listChildren(caller(guardianId));
    expect(children).toEqual([
      {
        relationshipId: proposed.id,
        childUserId: childId,
        displayName: 'PC-001 Child',
      },
    ]);
  });

  it('hides relationship mutation from an unrelated member and rejects self-relationships', async () => {
    await expect(family.proposeRelationship(guardianId, caller(guardianId))).rejects.toThrow();
    const active = await family.requireActiveRelationship(guardianId, childId);
    await expect(family.revokeRelationship(active.id, caller(outsiderId))).rejects.toThrow();
  });

  it('revocation ends authority but preserves history and permits a fresh later proposal', async () => {
    const current = await family.requireActiveRelationship(guardianId, childId);
    const revoked = await family.revokeRelationship(current.id, caller(childId));
    expect(revoked.status).toBe(ParentChildRelationshipStatus.REVOKED);
    await expect(family.requireActiveRelationship(guardianId, childId)).rejects.toThrow();

    const proposedAgain = await family.proposeRelationship(childId, caller(guardianId));
    expect(proposedAgain.id).not.toBe(current.id);
    expect(proposedAgain.status).toBe(ParentChildRelationshipStatus.PENDING);
    await family.assentRelationship(proposedAgain.id, caller(childId));
  });

  it('creates immutable versioned work contracts only for an active guardian and child-owned Responsibility', async () => {
    const responsibility = await responsibilities.createAccepted({
      principalUserId: childId,
      kind: ResponsibilityKind.OPPORTUNITY_DECISION,
      objective: 'PC-001 contract persistence proof only',
      originConversationId: randomUUID(),
      originOpportunityId: randomUUID(),
      successCriteria: { type: 'PC001_FOUNDATION_TEST' },
    });

    const base = {
      workForm: GovernedWorkForm.PRACTICE,
      sourceType: GovernedWorkSourceType.PARENT_ASSIGNED,
      sourceUserId: guardianId,
      stakeTypes: [GovernedWorkStakeType.AUTHORITATIVE_ASSIGNMENT],
      doneMeans: { type: 'FIVE_EXACT_ANSWERS' },
      principalCarries: { actions: ['attempt', 'submit'] },
      aureusCarries: { actions: ['teach', 'hint', 'verify'] },
      togetherCarries: { actions: ['review_error'] },
      humanRequired: { actions: ['change_done_means'] },
      expectedEvidence: { type: 'STRUCTURED_ANSWER_SET' },
      assistanceBoundary: { deny: ['DIRECT_TARGET_ANSWER'] },
      verificationPolicyVersion: 'fraction-decimal-basic-v1',
      workTemplateKey: 'fraction-decimal-basic-v1',
      difficultyKey: 'basic-v1',
    } as const;

    const v1 = await contracts.createInitial(responsibility.id, guardianId, childId, base);
    expect(v1.version).toBe(1);
    expect(v1.stakeTypes).toEqual([GovernedWorkStakeType.AUTHORITATIVE_ASSIGNMENT]);

    await expect(
      prisma.db.responsibilityWorkContract.update({
        where: { id: v1.id },
        data: { changeReason: 'silent mutation must fail' },
      }),
    ).rejects.toThrow();

    const v2 = await contracts.createRenegotiatedVersion(
      responsibility.id,
      guardianId,
      childId,
      'Parent explicitly changed the success standard',
      { ...base, doneMeans: { type: 'FOUR_EXACT_ANSWERS' } },
    );
    expect(v2.version).toBe(2);
    expect(v2.changeReason).toBe('Parent explicitly changed the success standard');

    const persistedV1 = await prisma.db.responsibilityWorkContract.findUniqueOrThrow({
      where: { id: v1.id },
    });
    expect(persistedV1.doneMeans).toEqual({ type: 'FIVE_EXACT_ANSWERS' });
    expect((await contracts.findCurrent(responsibility.id))?.version).toBe(2);

    await expect(
      contracts.createInitial(responsibility.id, outsiderId, childId, base),
    ).rejects.toThrow();
  });
});
