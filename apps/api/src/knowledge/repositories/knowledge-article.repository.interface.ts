import { KnowledgeArticle, KnowledgeArticleStatus, KnowledgeCategory, VerificationStatus } from '@prisma/client';

export const KNOWLEDGE_ARTICLE_REPOSITORY = 'KNOWLEDGE_ARTICLE_REPOSITORY';

export interface CreateArticleInput {
  title: string;
  summary: string;
  content: string;
  category: KnowledgeCategory;
  tags?: string[];
  sourceUrl?: string;
  authorId: string;
  lastUpdatedById: string;
}

export interface UpdateArticleInput {
  title?: string;
  summary?: string;
  content?: string;
  category?: KnowledgeCategory;
  tags?: string[];
  sourceUrl?: string | null;
  status?: KnowledgeArticleStatus;
  verificationStatus?: VerificationStatus;
  rejectionReason?: string | null;
  version?: number;
  datePublished?: Date;
  dateLastVerified?: Date;
  lastUpdatedById?: string;
}

export type SortField = 'newest' | 'alphabetical';

export interface ArticleQueryParams {
  page: number;
  limit: number;
  q?: string;
  category?: KnowledgeCategory;
  tags?: string[];
  status?: KnowledgeArticleStatus;
  verificationStatus?: VerificationStatus;
  authorId?: string;
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedArticles {
  data: KnowledgeArticle[];
  total: number;
  page: number;
  limit: number;
}

export interface IKnowledgeArticleRepository {
  create(data: CreateArticleInput): Promise<KnowledgeArticle>;
  setRef(id: string, articleRef: string): Promise<KnowledgeArticle>;
  findById(id: string): Promise<KnowledgeArticle | null>;
  findByRef(articleRef: string): Promise<KnowledgeArticle | null>;
  findAll(params: ArticleQueryParams): Promise<PaginatedArticles>;
  update(id: string, data: UpdateArticleInput): Promise<KnowledgeArticle>;
  softDelete(id: string): Promise<KnowledgeArticle>;
}
