import { randomUUID } from 'crypto';
import {
  OrganizationType,
  ResponsibilityActorClass,
  ResponsibilityAuthorityClass,
  ResponsibilityContextType,
  ResponsibilityEvidenceLevel,
  ResponsibilityEventType,
  ResponsibilityKind,
  ResponsibilityPrivacyScope,
  ResponsibilityStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaResponsibilityRepository } from './repositories/prisma-responsibility.repository';

describe('Responsibility Core — Prisma integration', () => {
  let prisma: PrismaService;
  let repo: PrismaResponsibilityRepository;
  let userId: string;
  let organizationId: string;

  const marker = 'or001-' + randomUUID();

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new PrismaResponsibilityRepository(prisma);

    const user = await prisma.db.user.create({
      data: { email: marker + '@example.test' },
    });
    userId = user.id;

    const organization = await prisma.db.organization.create({
      data: {
        name: 'OR-001 ' + marker,
        shortDescription: 'OR-001 integration organization',
        fullDescription: 'Temporary organization used only to prove the Responsibility context boundary.',
        organizationType: OrganizationType.BUSINESS,
        websiteUrl: 'https://example.test',
        createdById: userId,
        lastUpdatedById: userId,
      },
    });
    organizationId = organization.id;
  });

  afterAll(async () => {
    await prisma.db.organization.deleteMany({ where: { id: organizationId } });
    await prisma.db.user.deleteMany({ where: { id: userId } });
    await prisma.onModuleDestroy();
  });

  it('creates ACCEPTED + COMMITMENT_RECORDED atomically and deduplicates one open opportunity decision', async () => {
    const conversationId = randomUUID();
    const opportunityId = randomUUID();

    const first = await repo.createAccepted({
      principalUserId: userId,
      kind: ResponsibilityKind.OPPORTUNITY_DECISION,
      successCriteria: { type: 'OPPORTUNITY_DECISION_RECORDED' },
      objective: 'Decide the next step for the integration opportunity',
      originConversationId: conversationId,
      originOpportunityId: opportunityId,
    });
    const second = await repo.createAccepted({
      principalUserId: userId,
      kind: ResponsibilityKind.OPPORTUNITY_DECISION,
      successCriteria: { type: 'OPPORTUNITY_DECISION_RECORDED' },
      objective: 'A duplicate caller cannot create a second open commitment',
      originConversationId: conversationId,
      originOpportunityId: opportunityId,
    });

    expect(second.id).toBe(first.id);
    expect(first.contextType).toBe(ResponsibilityContextType.PERSONAL);
    expect(first.authorityClass).toBe(ResponsibilityAuthorityClass.GUIDANCE_ONLY);
    expect(first.privacyScope).toBe(ResponsibilityPrivacyScope.PERSONAL_PRIVATE);
    expect(first.events.map((event) => event.type)).toEqual([
      ResponsibilityEventType.ACCEPTED,
      ResponsibilityEventType.COMMITMENT_RECORDED,
    ]);
    expect(first.events[0].actorClass).toBe(ResponsibilityActorClass.MEMBER);
    expect(first.events[0].actorUserId).toBe(userId);
  });

  it('records USER_INPUT_REQUIRED once and then completes once with referenced reported evidence', async () => {
    const created = await repo.createAccepted({
      principalUserId: userId,
      kind: ResponsibilityKind.OPPORTUNITY_DECISION,
      successCriteria: { type: 'OPPORTUNITY_DECISION_RECORDED' },
      objective: 'Decide the next step for another integration opportunity',
      originConversationId: randomUUID(),
      originOpportunityId: randomUUID(),
    });

    const waiting = await repo.markWaitingOnUser(created.id, userId);
    const waitingAgain = await repo.markWaitingOnUser(created.id, userId);

    expect(waiting.status).toBe(ResponsibilityStatus.WAITING_ON_USER);
    expect(
      waitingAgain.events.filter(
        (event) => event.type === ResponsibilityEventType.USER_INPUT_REQUIRED,
      ),
    ).toHaveLength(1);

    const evidence = {
      sourceSystem: 'OPPORTUNITY_ENGINE',
      sourceRecordType: 'SavedOpportunity',
      sourceRecordId: randomUUID(),
      sourceState: 'APPLYING',
      evidenceLevel: ResponsibilityEvidenceLevel.REPORTED,
    };

    const completed = await repo.completeWithEvidence(
      created.id,
      userId,
      evidence,
    );
    const completedAgain = await repo.completeWithEvidence(
      created.id,
      userId,
      evidence,
    );

    expect(completed.status).toBe(ResponsibilityStatus.COMPLETED);
    expect(completed.completedAt).not.toBeNull();
    expect(
      completed.events.filter(
        (event) => event.type === ResponsibilityEventType.ACTION_EVIDENCED,
      ),
    ).toHaveLength(1);
    expect(
      completedAgain.events.filter(
        (event) => event.type === ResponsibilityEventType.COMPLETED,
      ),
    ).toHaveLength(1);

    const evidenceEvent = completed.events.find(
      (event) => event.type === ResponsibilityEventType.ACTION_EVIDENCED,
    );
    expect(evidenceEvent?.sourceRecordType).toBe('SavedOpportunity');
    expect(evidenceEvent?.sourceState).toBe('APPLYING');
    expect(evidenceEvent?.evidenceLevel).toBe(
      ResponsibilityEvidenceLevel.REPORTED,
    );
  });

  it('hides a personal Responsibility from another principal at the repository boundary', async () => {
    const created = await repo.createAccepted({
      principalUserId: userId,
      kind: ResponsibilityKind.OPPORTUNITY_DECISION,
      successCriteria: { type: 'OPPORTUNITY_DECISION_RECORDED' },
      objective: 'Private personal responsibility',
      originConversationId: randomUUID(),
      originOpportunityId: randomUUID(),
    });

    const otherUserId = randomUUID();
    await expect(repo.findPersonalById(created.id, otherUserId)).resolves.toBeNull();
  });

  it('rejects BUSINESS_TENANT creation for the only OR-001 kind at the database boundary', async () => {
    await expect(
      prisma.db.responsibility.create({
        data: {
          kind: ResponsibilityKind.OPPORTUNITY_DECISION,
          objective: 'This cross-context write must fail in OR-001',
          status: ResponsibilityStatus.ACTIVE,
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalUserId: null,
          principalOrganizationId: organizationId,
          originConversationId: randomUUID(),
          originOpportunityId: randomUUID(),
          successCriteria: { type: 'OPPORTUNITY_DECISION_RECORDED' },
          authorityClass: ResponsibilityAuthorityClass.GUIDANCE_ONLY,
          authorityPolicyVersion: 'responsibility-guidance-v1',
          privacyScope: ResponsibilityPrivacyScope.BUSINESS_PRIVATE,
          privacyPolicyVersion: 'business-private-v1',
        },
      }),
    ).rejects.toThrow();
  });

  it('cascades personal Responsibility/event state when the owning User is deleted', async () => {
    const ephemeral = await prisma.db.user.create({
      data: { email: 'cascade-' + marker + '@example.test' },
    });
    const created = await repo.createAccepted({
      principalUserId: ephemeral.id,
      kind: ResponsibilityKind.OPPORTUNITY_DECISION,
      successCriteria: { type: 'OPPORTUNITY_DECISION_RECORDED' },
      objective: 'Cascade lifecycle proof',
      originConversationId: randomUUID(),
      originOpportunityId: randomUUID(),
    });

    await prisma.db.user.delete({ where: { id: ephemeral.id } });

    expect(
      await prisma.db.responsibility.findUnique({ where: { id: created.id } }),
    ).toBeNull();
    expect(
      await prisma.db.responsibilityEvent.count({
        where: { responsibilityId: created.id },
      }),
    ).toBe(0);
  });
});
