import { KnowledgeArticleRevision, KnowledgeCategory } from '@prisma/client';

export const KNOWLEDGE_ARTICLE_REVISION_REPOSITORY = 'KNOWLEDGE_ARTICLE_REVISION_REPOSITORY';

export interface CreateRevisionInput {
  articleId: string;
  versionNumber: number;
  title: string;
  summary: string;
  content: string;
  category: KnowledgeCategory;
  editedById: string;
}

export interface IKnowledgeArticleRevisionRepository {
  create(data: CreateRevisionInput): Promise<KnowledgeArticleRevision>;
  findByArticle(articleId: string): Promise<KnowledgeArticleRevision[]>;
}
