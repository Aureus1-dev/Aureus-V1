import { randomUUID } from 'crypto';
import { OrganizationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaOrganizationRepository } from './repositories/prisma-organization.repository';
import { PrismaOrganizationMemberRepository } from './members/repositories/prisma-organization-member.repository';
import { OrganizationsService } from './organizations.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * Integration test: exercises OrganizationsService.create() against a real
 * PostgreSQL database (no mocks) to prove Step 1 §4's repair — atomic
 * organization creation. A mocked-Prisma unit test can show the service
 * calls `$transaction` once; it cannot prove a real mid-transaction
 * failure actually rolls back every write, which is the property that
 * matters (a partially-initialized, ownerless Organization row must never
 * become findable). This test forces a genuine failure on the transaction's
 * last write and then queries the real database to confirm nothing
 * persisted.
 *
 * Requires DATABASE_URL to point at a reachable, migrated database.
 */
describe('OrganizationsService.create — atomicity integration', () => {
  let prisma: PrismaService;
  let service: OrganizationsService;
  const markerNamePrefix = `INTEGRATION-ATOMIC-${randomUUID()}-`;
  const emailMarker = `integration-atomic-${randomUUID()}`;
  let callerId: string;
  let caller: AuthenticatedUser;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();

    const orgRepo = new PrismaOrganizationRepository(prisma);
    const memberRepo = new PrismaOrganizationMemberRepository(prisma);
    service = new OrganizationsService(orgRepo, memberRepo, prisma);

    const user = await prisma.db.user.create({
      data: { email: `caller-${emailMarker}@example.test`, roles: ['MEMBER'] },
    });
    callerId = user.id;
    caller = { id: callerId, email: user.email, roles: ['ORGANIZATION_REPRESENTATIVE'] };
  });

  afterAll(async () => {
    await prisma.db.tenantAuditEvent.deleteMany({
      where: { organization: { name: { startsWith: markerNamePrefix } } },
    });
    await prisma.db.organizationMember.deleteMany({
      where: { organization: { name: { startsWith: markerNamePrefix } } },
    });
    await prisma.db.organization.deleteMany({ where: { name: { startsWith: markerNamePrefix } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await prisma.onModuleDestroy();
  });

  const validPayload = (overrides: Record<string, unknown> = {}) => ({
    name: `${markerNamePrefix}Atomic Test Co`,
    shortDescription: 'S',
    fullDescription: 'A full description of the atomicity test organization.',
    organizationType: OrganizationType.BUSINESS,
    websiteUrl: 'https://example.test',
    ...overrides,
  });

  it('commits the organization row, reference, OWNER membership, and audit event together', async () => {
    const result = await service.create(validPayload() as never, caller);

    expect(result.organizationRef).toMatch(/^AUR-ORG-\d{6}$/);

    const member = await prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: result.id, userId: callerId } },
    });
    expect(member?.role).toBe('OWNER');

    const auditEvent = await prisma.db.tenantAuditEvent.findFirst({
      where: { organizationId: result.id, action: 'ORGANIZATION_CREATED' },
    });
    expect(auditEvent).not.toBeNull();
  });

  it(
    'rolls back the entire creation — no organization, no member, no audit event — ' +
      'when the last write in the transaction fails',
    async () => {
      const failingName = `${markerNamePrefix}Rollback Test Co`;
      const realTransaction = prisma.db.$transaction.bind(prisma.db);
      const transactionSpy = jest
        .spyOn(prisma.db, '$transaction')
        // @ts-expect-error — deliberately narrow override for one interactive-transaction call.
        .mockImplementation((fn: (tx: typeof prisma.db) => Promise<unknown>) =>
          realTransaction((tx) => {
            const patchedTx = {
              ...tx,
              tenantAuditEvent: {
                ...tx.tenantAuditEvent,
                create: () => {
                  throw new Error('Simulated audit-event write failure');
                },
              },
            } as typeof tx;
            return fn(patchedTx);
          }),
        );

      try {
        await expect(
          service.create(validPayload({ name: failingName }) as never, caller),
        ).rejects.toThrow('Simulated audit-event write failure');
      } finally {
        transactionSpy.mockRestore();
      }

      const persisted = await prisma.db.organization.findFirst({ where: { name: failingName } });
      expect(persisted).toBeNull();

      const orphanMember = await prisma.db.organizationMember.findFirst({
        where: { organization: { name: failingName } },
      });
      expect(orphanMember).toBeNull();

      const orphanAudit = await prisma.db.tenantAuditEvent.findFirst({
        where: { organization: { name: failingName } },
      });
      expect(orphanAudit).toBeNull();
    },
  );
});
