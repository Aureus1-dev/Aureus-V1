import { Injectable } from '@nestjs/common';
import { KnowledgeArticle, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ArticleQueryParams,
  CreateArticleInput,
  IKnowledgeArticleRepository,
  PaginatedArticles,
  UpdateArticleInput,
} from './knowledge-article.repository.interface';

@Injectable()
export class PrismaKnowledgeArticleRepository implements IKnowledgeArticleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateArticleInput): Promise<KnowledgeArticle> {
    return this.prisma.db.knowledgeArticle.create({ data });
  }

  async setRef(id: string, articleRef: string): Promise<KnowledgeArticle> {
    return this.prisma.db.knowledgeArticle.update({ where: { id }, data: { articleRef } });
  }

  async findById(id: string): Promise<KnowledgeArticle | null> {
    return this.prisma.db.knowledgeArticle.findFirst({ where: { id, deletedAt: null } });
  }

  async findByRef(articleRef: string): Promise<KnowledgeArticle | null> {
    return this.prisma.db.knowledgeArticle.findFirst({ where: { articleRef, deletedAt: null } });
  }

  async findAll(params: ArticleQueryParams): Promise<PaginatedArticles> {
    const {
      page, limit, q, category, tags, status, verificationStatus, authorId,
      sortBy = 'newest', sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const searchClauses: Prisma.KnowledgeArticleWhereInput[] = q
      ? [
          { title:   { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ]
      : [];

    const where: Prisma.KnowledgeArticleWhereInput = {
      deletedAt: null,
      ...(searchClauses.length && { OR: searchClauses }),
      ...(category            && { category }),
      ...(tags?.length         && { tags: { hasSome: tags } }),
      ...(status               && { status }),
      ...(verificationStatus   && { verificationStatus }),
      ...(authorId              && { authorId }),
    };

    const dir = sortOrder;
    const orderBy: Prisma.KnowledgeArticleOrderByWithRelationInput =
      sortBy === 'alphabetical' ? { title: dir } : { createdAt: dir }; // 'newest'

    const [data, total] = await Promise.all([
      this.prisma.db.knowledgeArticle.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.db.knowledgeArticle.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateArticleInput): Promise<KnowledgeArticle> {
    return this.prisma.db.knowledgeArticle.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<KnowledgeArticle> {
    return this.prisma.db.knowledgeArticle.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
