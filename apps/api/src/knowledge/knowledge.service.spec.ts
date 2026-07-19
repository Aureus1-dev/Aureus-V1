import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { KnowledgeArticleStatus, KnowledgeCategory, NotificationCategory, UserRole, VerificationStatus } from '@prisma/client';
import { KnowledgeService } from './knowledge.service';
import {
  IKnowledgeArticleRepository,
  KNOWLEDGE_ARTICLE_REPOSITORY,
} from './repositories/knowledge-article.repository.interface';
import {
  IKnowledgeArticleRevisionRepository,
  KNOWLEDGE_ARTICLE_REVISION_REPOSITORY,
} from './repositories/knowledge-article-revision.repository.interface';
import { NotificationsService } from '../communication/notifications/notifications.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type { KnowledgeArticle } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const AUTHOR: AuthenticatedUser = { id: 'author-001', email: 'author@example.com', roles: [UserRole.STEWARD] };
const OTHER_MEMBER: AuthenticatedUser = { id: 'member-001', email: 'member@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeArticle = (o: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id: 'article-001', sequenceNumber: 1, articleRef: 'AUR-KB-000001',
  title: 'How to Request a Steward', summary: 'A quick guide', content: 'Full content here, quite long.',
  category: KnowledgeCategory.GUIDE, tags: ['stewardship'], sourceUrl: null,
  status: KnowledgeArticleStatus.DRAFT, verificationStatus: VerificationStatus.DRAFT, rejectionReason: null,
  version: 1, datePublished: null, dateLastVerified: null,
  authorId: AUTHOR.id, lastUpdatedById: AUTHOR.id,
  createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<IKnowledgeArticleRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(),
  findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};
const mockRevisionRepo: jest.Mocked<IKnowledgeArticleRevisionRepository> = {
  create: jest.fn(), findByArticle: jest.fn(),
};
const mockNotificationsService = { notify: jest.fn() } as unknown as NotificationsService;

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: KNOWLEDGE_ARTICLE_REPOSITORY, useValue: mockRepo },
        { provide: KNOWLEDGE_ARTICLE_REVISION_REPOSITORY, useValue: mockRevisionRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = m.get(KnowledgeService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates an article authored by the caller and sets its ref', async () => {
      const raw = makeArticle({ articleRef: null });
      mockRepo.create.mockResolvedValue(raw);
      mockRepo.setRef.mockResolvedValue({ ...raw, articleRef: 'AUR-KB-000001' });

      const result = await service.create({
        title: 'How to Request a Steward', summary: 'A quick guide', content: 'Full content here, quite long.',
        category: KnowledgeCategory.GUIDE,
      }, AUTHOR);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: AUTHOR.id, lastUpdatedById: AUTHOR.id }),
      );
      expect(result.articleRef).toBe('AUR-KB-000001');
    });

    it('strips markup from title, summary, and content before persisting (PD-001)', async () => {
      const raw = makeArticle({ articleRef: null });
      mockRepo.create.mockResolvedValue(raw);
      mockRepo.setRef.mockResolvedValue({ ...raw, articleRef: 'AUR-KB-000001' });

      await service.create({
        title: '<b>How</b> to Request a Steward',
        summary: '<script>alert(1)</script>A quick guide',
        content: 'Full content <i>here</i>, quite long.',
        category: KnowledgeCategory.GUIDE,
      }, AUTHOR);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'How to Request a Steward',
        summary: 'A quick guide',
        content: 'Full content here, quite long.',
      }));
    });
  });

  describe('findAll', () => {
    it('defaults to VERIFIED-only listing', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAll({ page: 1, limit: 20 });
      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ verificationStatus: VerificationStatus.VERIFIED }));
    });
  });

  describe('findById / findByRef', () => {
    it('throws NotFoundException for a missing article by id', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('ghost')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for a missing article by ref', async () => {
      mockRepo.findByRef.mockResolvedValue(null);
      await expect(service.findByRef('AUR-KB-999999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update — authorization and revision tracking', () => {
    it('allows the author to update and creates no revision for a non-substantive edit', async () => {
      mockRepo.findById.mockResolvedValue(makeArticle());
      mockRepo.update.mockResolvedValue(makeArticle({ tags: ['stewardship', 'faq'] }));

      await service.update('article-001', { tags: ['stewardship', 'faq'] }, AUTHOR);

      expect(mockRevisionRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith('article-001', expect.objectContaining({ version: 1 }));
    });

    it('creates a revision snapshot and bumps version on a substantive edit (title/summary/content/category)', async () => {
      const existing = makeArticle();
      mockRepo.findById.mockResolvedValue(existing);
      mockRepo.update.mockResolvedValue(makeArticle({ title: 'Updated Title', version: 2 }));

      await service.update('article-001', { title: 'Updated Title' }, AUTHOR);

      expect(mockRevisionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        articleId: 'article-001', versionNumber: 1, title: existing.title, content: existing.content,
      }));
      expect(mockRepo.update).toHaveBeenCalledWith('article-001', expect.objectContaining({ version: 2 }));
    });

    it('forbids a non-author, non-privileged caller from updating', async () => {
      mockRepo.findById.mockResolvedValue(makeArticle());
      await expect(service.update('article-001', { title: 'x' }, OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('allows an Administrator to update any article', async () => {
      mockRepo.findById.mockResolvedValue(makeArticle());
      mockRepo.update.mockResolvedValue(makeArticle());
      await expect(service.update('article-001', { tags: ['x'] }, ADMIN)).resolves.toBeDefined();
    });
  });

  describe('findRevisions', () => {
    it('returns the revision history for an article', async () => {
      mockRepo.findById.mockResolvedValue(makeArticle());
      mockRevisionRepo.findByArticle.mockResolvedValue([
        { id: 'rev-1', articleId: 'article-001', versionNumber: 1, title: 'Old', summary: 'x', content: 'y', category: KnowledgeCategory.GUIDE, editedById: AUTHOR.id, createdAt: NOW },
      ]);
      const result = await service.findRevisions('article-001');
      expect(result).toHaveLength(1);
    });

    it('throws NotFoundException for a missing article', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findRevisions('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verification workflow', () => {
    it('submits DRAFT → PENDING_REVIEW', async () => {
      mockRepo.findById.mockResolvedValue(makeArticle());
      mockRepo.update.mockResolvedValue(makeArticle({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      const result = await service.submitForReview('article-001', AUTHOR);
      expect(result.verificationStatus).toBe(VerificationStatus.PENDING_REVIEW);
    });

    it('rejects submitting a non-DRAFT article', async () => {
      mockRepo.findById.mockResolvedValue(makeArticle({ verificationStatus: VerificationStatus.VERIFIED }));
      await expect(service.submitForReview('article-001', AUTHOR)).rejects.toThrow(ConflictException);
    });

    it('verifies PENDING_REVIEW → VERIFIED and notifies the author', async () => {
      const pending = makeArticle({ verificationStatus: VerificationStatus.PENDING_REVIEW });
      mockRepo.findById.mockResolvedValue(pending);
      mockRepo.update.mockResolvedValue(makeArticle({ verificationStatus: VerificationStatus.VERIFIED, status: KnowledgeArticleStatus.ACTIVE }));

      const result = await service.verify('article-001', ADMIN);

      expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: AUTHOR.id, category: NotificationCategory.KNOWLEDGE, type: 'knowledge.article.verified',
      }));
    });

    it('rejects verifying a non-PENDING_REVIEW article', async () => {
      mockRepo.findById.mockResolvedValue(makeArticle({ verificationStatus: VerificationStatus.DRAFT }));
      await expect(service.verify('article-001', ADMIN)).rejects.toThrow(ConflictException);
    });

    it('rejects PENDING_REVIEW → REJECTED with a reason and notifies the author', async () => {
      const pending = makeArticle({ verificationStatus: VerificationStatus.PENDING_REVIEW });
      mockRepo.findById.mockResolvedValue(pending);
      mockRepo.update.mockResolvedValue(makeArticle({ verificationStatus: VerificationStatus.REJECTED, rejectionReason: 'Needs more detail' }));

      const result = await service.reject('article-001', { rejectionReason: 'Needs more detail' }, ADMIN);

      expect(result.verificationStatus).toBe(VerificationStatus.REJECTED);
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: AUTHOR.id, category: NotificationCategory.KNOWLEDGE, type: 'knowledge.article.rejected',
      }));
    });

    it('archives an article regardless of status', async () => {
      mockRepo.findById.mockResolvedValue(makeArticle({ verificationStatus: VerificationStatus.VERIFIED }));
      mockRepo.update.mockResolvedValue(makeArticle({ verificationStatus: VerificationStatus.ARCHIVED, status: KnowledgeArticleStatus.ARCHIVED }));
      const result = await service.archive('article-001', AUTHOR);
      expect(result.status).toBe(KnowledgeArticleStatus.ARCHIVED);
    });
  });

  describe('remove', () => {
    it('soft-deletes an article the caller authors', async () => {
      mockRepo.findById.mockResolvedValue(makeArticle());
      mockRepo.softDelete.mockResolvedValue(makeArticle({ deletedAt: NOW }));
      await expect(service.remove('article-001', AUTHOR)).resolves.toBeUndefined();
      expect(mockRepo.softDelete).toHaveBeenCalledWith('article-001');
    });

    it('forbids a non-author, non-privileged caller from deleting', async () => {
      mockRepo.findById.mockResolvedValue(makeArticle());
      await expect(service.remove('article-001', OTHER_MEMBER)).rejects.toThrow(ForbiddenException);
    });
  });
});
