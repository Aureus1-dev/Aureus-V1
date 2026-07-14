import { randomUUID } from 'crypto';
import {
  ResourceCategory, ResourceType, SourceType, VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaResourceRepository } from './repositories/prisma-resource.repository';
import type { CreateResourceInput } from './repositories/resource.repository.interface';

/**
 * Integration test: exercises PrismaResourceRepository against a real
 * PostgreSQL database (no mocks). Verifies Prisma query correctness — array
 * containment (`tags`), enum filtering, case-insensitive search, and the
 * unique constraints defined in the `add_resource_directory` migration —
 * which mocked-repository unit tests cannot catch.
 *
 * Requires DATABASE_URL to point at a reachable, migrated database.
 */
describe('Resources — Prisma integration', () => {
  let prisma: PrismaService;
  let repo: PrismaResourceRepository;
  const ownerId = randomUUID();
  const markerTitlePrefix = `INTEGRATION-TEST-${randomUUID()}-`;

  const baseInput = (overrides: Partial<CreateResourceInput> = {}): CreateResourceInput => ({
    title: `${markerTitlePrefix}Legal Aid Society`,
    shortDescription: 'Free legal help for residents',
    fullDescription: 'A full description of the legal aid services offered.',
    category: ResourceCategory.LEGAL_SERVICES,
    resourceType: ResourceType.ORGANIZATION,
    tags: ['free', 'walk-in'],
    organizationName: 'Legal Aid Society',
    officialSourceUrl: 'https://legalaid.example.org',
    country: 'United States',
    state: 'Texas',
    city: 'Austin',
    sourceName: 'Legal Aid Society',
    sourceType: SourceType.ORGANIZATION_SUBMISSION,
    ownerId,
    submittedById: ownerId,
    createdById: ownerId,
    lastUpdatedById: ownerId,
    ...overrides,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new PrismaResourceRepository(prisma);
  });

  afterAll(async () => {
    await prisma.db.resource.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.onModuleDestroy();
  });

  it('persists a resource and enforces the unique resourceRef constraint', async () => {
    const created = await repo.create(baseInput());
    expect(created.id).toBeDefined();
    expect(created.resourceRef).toBeNull();

    const ref = `AUR-RES-${created.sequenceNumber.toString().padStart(6, '0')}`;
    const withRef = await repo.setRef(created.id, ref);
    expect(withRef.resourceRef).toBe(ref);

    await expect(
      prisma.db.resource.update({ where: { id: created.id }, data: { resourceRef: ref } }),
    ).resolves.toBeDefined(); // same value, no conflict

    const another = await repo.create(baseInput({ title: `${markerTitlePrefix}Second` }));
    await expect(repo.setRef(another.id, ref)).rejects.toThrow(); // unique violation
  });

  it('round-trips through findById, excluding soft-deleted records', async () => {
    const created = await repo.create(baseInput({ title: `${markerTitlePrefix}FindById` }));

    const found = await repo.findById(created.id);
    expect(found?.id).toBe(created.id);

    await repo.softDelete(created.id);
    const afterDelete = await repo.findById(created.id);
    expect(afterDelete).toBeNull();
  });

  it('findByRef locates a resource by its stable human-readable reference', async () => {
    const created = await repo.create(baseInput({ title: `${markerTitlePrefix}FindByRef` }));
    const ref = `AUR-RES-REF-${created.id.slice(0, 8)}`;
    await repo.setRef(created.id, ref);

    const found = await repo.findByRef(ref);
    expect(found?.id).toBe(created.id);
  });

  it('filters by category, tags (array containment), and case-insensitive search', async () => {
    await repo.create(baseInput({
      title: `${markerTitlePrefix}Housing Help`,
      category: ResourceCategory.HOUSING_RESOURCES,
      tags: ['emergency', 'shelter'],
      organizationName: 'Housing Help Coalition',
    }));
    await repo.create(baseInput({
      title: `${markerTitlePrefix}Career Center`,
      category: ResourceCategory.EMPLOYMENT_SERVICES,
      tags: ['resume', 'interview-prep'],
      organizationName: 'Career Center',
    }));

    const byCategory = await repo.findAll({
      page: 1, limit: 20, category: ResourceCategory.HOUSING_RESOURCES,
      q: markerTitlePrefix,
    });
    expect(byCategory.data.every((r) => r.category === ResourceCategory.HOUSING_RESOURCES)).toBe(true);
    expect(byCategory.data.some((r) => r.title.includes('Housing Help'))).toBe(true);

    const byTag = await repo.findAll({ page: 1, limit: 20, tags: ['shelter'], q: markerTitlePrefix });
    expect(byTag.data.some((r) => r.title.includes('Housing Help'))).toBe(true);
    expect(byTag.data.some((r) => r.title.includes('Career Center'))).toBe(false);

    const bySearch = await repo.findAll({ page: 1, limit: 20, q: 'housing help coalition' });
    expect(bySearch.data.some((r) => r.title.startsWith(markerTitlePrefix) && r.title.includes('Housing Help'))).toBe(true);
  });

  it('paginates correctly across multiple records', async () => {
    for (let i = 0; i < 3; i += 1) {
      await repo.create(baseInput({ title: `${markerTitlePrefix}Page-${i}` }));
    }

    const page1 = await repo.findAll({ page: 1, limit: 2, q: markerTitlePrefix, verificationStatus: undefined });
    expect(page1.data.length).toBeLessThanOrEqual(2);
    expect(page1.total).toBeGreaterThanOrEqual(3);
  });

  it('updates fields and recomputes verification status transitions', async () => {
    const created = await repo.create(baseInput({ title: `${markerTitlePrefix}Update` }));

    const updated = await repo.update(created.id, {
      verificationStatus: VerificationStatus.PENDING_REVIEW,
      lastUpdatedById: ownerId,
    });

    expect(updated.verificationStatus).toBe(VerificationStatus.PENDING_REVIEW);
  });
});
