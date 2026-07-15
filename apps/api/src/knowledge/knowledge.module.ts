import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CommunicationModule } from '../communication/communication.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { PrismaKnowledgeArticleRepository } from './repositories/prisma-knowledge-article.repository';
import { KNOWLEDGE_ARTICLE_REPOSITORY } from './repositories/knowledge-article.repository.interface';
import { PrismaKnowledgeArticleRevisionRepository } from './repositories/prisma-knowledge-article-revision.repository';
import { KNOWLEDGE_ARTICLE_REVISION_REPOSITORY } from './repositories/knowledge-article-revision.repository.interface';

@Module({
  imports: [AuthGuardsModule, CommunicationModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    { provide: KNOWLEDGE_ARTICLE_REPOSITORY, useClass: PrismaKnowledgeArticleRepository },
    { provide: KNOWLEDGE_ARTICLE_REVISION_REPOSITORY, useClass: PrismaKnowledgeArticleRevisionRepository },
  ],
  exports: [KnowledgeService, KNOWLEDGE_ARTICLE_REPOSITORY],
})
export class KnowledgeModule {}
