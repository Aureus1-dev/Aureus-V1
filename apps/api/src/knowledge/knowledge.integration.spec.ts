import { randomUUID } from 'crypto';
import { KnowledgeCategory, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaKnowledgeArticleRepository } from './repositories/prisma-knowledge-article.repository';
import { PrismaKnowledgeArticleRevisionRepository } from './repositories/prisma-knowledge-article-revision.repository';
import type { CreateArticleInput } from './repositories/knowledge-article.repository.interface';

/**
 * Integration test: exercises the Knowledge System's Prisma repositories
 * against a real PostgreSQL database (no mocks) — verifying query
 * correctness (case-insensitive full-text search, array containment on
 * `tags`, the unique `articleRef` constraint) and the
 * [articleId, versionNumber] unique constraint on KnowledgeArticleRevision
 * that makes revision history append-only and gap-free.
 *
 * Requires DATABASE_URL to point at a reachable, migrated database.
 */
describe('Knowledge System — Prisma integration', () => {
  let prisma: PrismaService;
  let repo: PrismaKnowledgeArticleRepository;
  let revisionRepo: PrismaKnowledgeArticleRevisionRepository;
  const authorId = randomUUID();
  const markerTitlePrefix = `INTEGRATION-TEST-${randomUUID()}-`;

  const baseInput = (overrides: Partial<CreateArticleInput> = {}): CreateArticleInput => ({
    title: `${markerTitlePrefix}How to Request a Steward`,
    summary: 'A quick guide to requesting a steward',
    content: 'Full walkthrough content describing the steward request process in detail.',
    category: KnowledgeCategory.GUIDE,
    tags: ['stewardship', 'getting-started'],
    authorId,
    lastUpdatedById: authorId,
    ...overrides,
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new PrismaKnowledgeArticleRepository(prisma);
    revisionRepo = new PrismaKnowledgeArticleRevisionRepository(prisma);
  });

  afterAll(async () => {
    await prisma.db.knowledgeArticle.deleteMany({ where: { title: { startsWith: markerTitlePrefix } } });
    await prisma.onModuleDestroy();
  });

  it('persists an article and enforces the unique articleRef constraint', async () => {
    const created = await repo.create(baseInput());
    expect(created.id).toBeDefined();
    expect(created.articleRef).toBeNull();

    const ref = `AUR-KB-${created.sequenceNumber.toString().padStart(6, '0')}`;
    const withRef = await repo.setRef(created.id, ref);
    expect(withRef.articleRef).toBe(ref);

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

  it('performs case-insensitive full-text search and tag-array containment', async () => {
    await repo.create(baseInput({ title: `${markerTitlePrefix}Understanding Journeys`, tags: ['journey', 'onboarding'] }));

    const bySearch = await repo.findAll({
      page: 1, limit: 50, q: 'understanding journeys', verificationStatus: VerificationStatus.DRAFT,
    });
    expect(bySearch.data.some((a) => a.title.startsWith(`${markerTitlePrefix}Understanding Journeys`))).toBe(true);

    const byTag = await repo.findAll({
      page: 1, limit: 50, tags: ['onboarding'], verificationStatus: VerificationStatus.DRAFT,
    });
    expect(byTag.data.some((a) => a.title.startsWith(`${markerTitlePrefix}Understanding Journeys`))).toBe(true);
  });

  it('enforces the [articleId, versionNumber] unique constraint on revisions', async () => {
    const article = await repo.create(baseInput({ title: `${markerTitlePrefix}Revisions` }));

    await revisionRepo.create({
      articleId: article.id, versionNumber: 1, title: article.title, summary: article.summary,
      content: article.content, category: article.category, editedById: authorId,
    });

    await expect(
      revisionRepo.create({
        articleId: article.id, versionNumber: 1, title: 'Duplicate version', summary: 'x',
        content: 'y', category: article.category, editedById: authorId,
      }),
    ).rejects.toThrow();

    const history = await revisionRepo.findByArticle(article.id);
    expect(history).toHaveLength(1);
    expect(history[0].versionNumber).toBe(1);
  });
});
