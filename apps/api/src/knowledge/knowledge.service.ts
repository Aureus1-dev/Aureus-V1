import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { KnowledgeArticleStatus, NotificationCategory, UserRole, VerificationStatus } from '@prisma/client';
import type { KnowledgeArticle } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import { RejectArticleDto } from './dto/reject-article.dto';
import { ArticleResponseDto } from './dto/article-response.dto';
import { PaginatedArticlesResponseDto } from './dto/paginated-articles-response.dto';
import { RevisionResponseDto } from './dto/revision-response.dto';
import {
  IKnowledgeArticleRepository,
  KNOWLEDGE_ARTICLE_REPOSITORY,
} from './repositories/knowledge-article.repository.interface';
import {
  IKnowledgeArticleRevisionRepository,
  KNOWLEDGE_ARTICLE_REVISION_REPOSITORY,
} from './repositories/knowledge-article-revision.repository.interface';
import { NotificationsService } from '../communication/notifications/notifications.service';

const MANAGE_ANY_ROLES: UserRole[] = [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

// Fields that constitute a substantive edit — changing any of these creates
// a KnowledgeArticleRevision snapshot of the pre-edit state and bumps
// `version` (PA-013 "track revisions and version history").
const REVISION_TRIGGER_FIELDS = ['title', 'summary', 'content', 'category'] as const;

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @Inject(KNOWLEDGE_ARTICLE_REPOSITORY) private readonly repo: IKnowledgeArticleRepository,
    @Inject(KNOWLEDGE_ARTICLE_REVISION_REPOSITORY) private readonly revisionRepo: IKnowledgeArticleRevisionRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────

  async create(dto: CreateArticleDto, caller: AuthenticatedUser): Promise<ArticleResponseDto> {
    const article = await this.repo.create({
      ...dto,
      authorId: caller.id,
      lastUpdatedById: caller.id,
    });

    const articleRef = `AUR-KB-${article.sequenceNumber.toString().padStart(6, '0')}`;
    const updated = await this.repo.setRef(article.id, articleRef);

    this.logger.log(`Knowledge article created: ${articleRef} by ${caller.id}`);
    return ArticleResponseDto.fromEntity(updated);
  }

  // ── Read ──────────────────────────────────────────────────────────────

  async findAll(query: ListArticlesQueryDto): Promise<PaginatedArticlesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    // Default: only show VERIFIED articles to the general audience — the
    // same "trustworthy by default" behavior Resources/Opportunities use.
    const verificationStatus = query.verificationStatus ?? VerificationStatus.VERIFIED;

    const result = await this.repo.findAll({
      page, limit, verificationStatus,
      q: query.q,
      category: query.category,
      tags: query.tags,
      status: query.status,
      authorId: query.authorId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      data: result.data.map(ArticleResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<ArticleResponseDto> {
    const article = await this.repo.findById(id);
    if (!article) throw new NotFoundException(`Knowledge article '${id}' not found`);
    return ArticleResponseDto.fromEntity(article);
  }

  async findByRef(articleRef: string): Promise<ArticleResponseDto> {
    const article = await this.repo.findByRef(articleRef);
    if (!article) throw new NotFoundException(`Knowledge article '${articleRef}' not found`);
    return ArticleResponseDto.fromEntity(article);
  }

  async findRevisions(id: string): Promise<RevisionResponseDto[]> {
    const article = await this.repo.findById(id);
    if (!article) throw new NotFoundException(`Knowledge article '${id}' not found`);
    const revisions = await this.revisionRepo.findByArticle(id);
    return revisions.map(RevisionResponseDto.fromEntity);
  }

  // ── Update ────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateArticleDto, caller: AuthenticatedUser): Promise<ArticleResponseDto> {
    const existing = await this.getOwnedOrThrow(id, caller);

    if (this.isSubstantiveEdit(dto)) {
      await this.revisionRepo.create({
        articleId: id,
        versionNumber: existing.version,
        title: existing.title,
        summary: existing.summary,
        content: existing.content,
        category: existing.category,
        editedById: caller.id,
      });
    }

    const updated = await this.repo.update(id, {
      ...dto,
      version: this.isSubstantiveEdit(dto) ? existing.version + 1 : existing.version,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Knowledge article updated: ${updated.articleRef ?? id} by ${caller.id}`);
    return ArticleResponseDto.fromEntity(updated);
  }

  // ── Soft delete ───────────────────────────────────────────────────────

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    const existing = await this.getOwnedOrThrow(id, caller);
    await this.repo.softDelete(id);
    this.logger.log(`Knowledge article soft-deleted: ${existing.articleRef ?? id} by ${caller.id}`);
  }

  // ── Verification Workflow ────────────────────────────────────────────

  /** Move DRAFT → PENDING_REVIEW. Author, Steward, or Admin may submit. */
  async submitForReview(id: string, caller: AuthenticatedUser): Promise<ArticleResponseDto> {
    const article = await this.getOwnedOrThrow(id, caller);

    if (article.verificationStatus !== VerificationStatus.DRAFT) {
      throw new ConflictException(
        `Article is in '${article.verificationStatus}' status. Only DRAFT articles can be submitted for review.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.PENDING_REVIEW,
      status: KnowledgeArticleStatus.DRAFT,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Knowledge article submitted for review: ${article.articleRef ?? id} by ${caller.id}`);
    return ArticleResponseDto.fromEntity(updated);
  }

  /** Move PENDING_REVIEW → VERIFIED. Steward/Admin only (enforced by controller guard). */
  async verify(id: string, caller: AuthenticatedUser): Promise<ArticleResponseDto> {
    const article = await this.repo.findById(id);
    if (!article) throw new NotFoundException(`Knowledge article '${id}' not found`);

    if (article.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Article is in '${article.verificationStatus}' status. Only PENDING_REVIEW articles can be verified.`,
      );
    }

    const now = new Date();
    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.VERIFIED,
      status: KnowledgeArticleStatus.ACTIVE,
      dateLastVerified: now,
      datePublished: article.datePublished ?? now,
      rejectionReason: null,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Knowledge article verified: ${article.articleRef ?? id} by ${caller.id}`);
    await this.notifyAuthor(article, 'knowledge.article.verified', 'Your knowledge article was verified', `"${article.title}" has been verified and published.`);
    return ArticleResponseDto.fromEntity(updated);
  }

  /** Move PENDING_REVIEW → REJECTED. Steward/Admin only (enforced by controller guard). */
  async reject(id: string, dto: RejectArticleDto, caller: AuthenticatedUser): Promise<ArticleResponseDto> {
    const article = await this.repo.findById(id);
    if (!article) throw new NotFoundException(`Knowledge article '${id}' not found`);

    if (article.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Article is in '${article.verificationStatus}' status. Only PENDING_REVIEW articles can be rejected.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.REJECTED,
      status: KnowledgeArticleStatus.DRAFT,
      rejectionReason: dto.rejectionReason,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Knowledge article rejected: ${article.articleRef ?? id} by ${caller.id}`);
    await this.notifyAuthor(article, 'knowledge.article.rejected', 'Your knowledge article was not approved', `"${article.title}" was rejected: ${dto.rejectionReason}`);
    return ArticleResponseDto.fromEntity(updated);
  }

  /** Archive an article regardless of current status. Author, Steward, or Admin. */
  async archive(id: string, caller: AuthenticatedUser): Promise<ArticleResponseDto> {
    const article = await this.getOwnedOrThrow(id, caller);

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.ARCHIVED,
      status: KnowledgeArticleStatus.ARCHIVED,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Knowledge article archived: ${article.articleRef ?? id} by ${caller.id}`);
    return ArticleResponseDto.fromEntity(updated);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private isSubstantiveEdit(dto: UpdateArticleDto): boolean {
    return REVISION_TRIGGER_FIELDS.some((field) => dto[field] !== undefined);
  }

  /**
   * Second real domain-integration call site for Communication System's
   * notify() (ADR-012), alongside Announcements — notifies an article's
   * author of a verification-workflow outcome. Uses a dedupeKey so a
   * retried verify/reject call never double-notifies.
   */
  private async notifyAuthor(article: KnowledgeArticle, type: string, title: string, body: string): Promise<void> {
    try {
      await this.notificationsService.notify({
        recipientId: article.authorId,
        category: NotificationCategory.KNOWLEDGE,
        type,
        title,
        body,
        dedupeKey: `${type}:${article.id}:${article.version}`,
      });
    } catch (err) {
      this.logger.warn(`Failed to notify author ${article.authorId} for article ${article.id}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  /**
   * Loads an article and enforces authorship (PA-018): the article's
   * author may manage it, and Stewards/Admins may manage any article
   * regardless of authorship (moderation authority).
   */
  private async getOwnedOrThrow(id: string, caller: AuthenticatedUser): Promise<KnowledgeArticle> {
    const article = await this.repo.findById(id);
    if (!article) throw new NotFoundException(`Knowledge article '${id}' not found`);

    const isAuthor = article.authorId === caller.id;
    const isPrivileged = caller.roles.some((role) => MANAGE_ANY_ROLES.includes(role as UserRole));

    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to manage this article');
    }

    return article;
  }
}
