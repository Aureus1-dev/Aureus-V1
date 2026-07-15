import { Injectable } from '@nestjs/common';
import { KnowledgeArticleRevision } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRevisionInput,
  IKnowledgeArticleRevisionRepository,
} from './knowledge-article-revision.repository.interface';

@Injectable()
export class PrismaKnowledgeArticleRevisionRepository implements IKnowledgeArticleRevisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRevisionInput): Promise<KnowledgeArticleRevision> {
    return this.prisma.db.knowledgeArticleRevision.create({ data });
  }

  async findByArticle(articleId: string): Promise<KnowledgeArticleRevision[]> {
    return this.prisma.db.knowledgeArticleRevision.findMany({
      where: { articleId },
      orderBy: { versionNumber: 'desc' },
    });
  }
}
