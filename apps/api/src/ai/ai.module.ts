import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CommunicationModule } from '../communication/communication.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { ResourcesModule } from '../resources/resources.module';
import { JourneysModule } from '../journeys/journeys.module';
import { GoalsModule } from '../goals/goals.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { AcademyModule } from '../academy/academy.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { AiProviderModule } from './providers/ai-provider.module';

import { AiRequestsController } from './requests/ai-requests.controller';
import { AiRequestsService } from './requests/ai-requests.service';
import { PrismaAiRequestRepository } from './requests/repositories/prisma-ai-request.repository';
import { AI_REQUEST_REPOSITORY } from './requests/repositories/ai-request.repository.interface';

import { ConversationsController } from './conversations/conversations.controller';
import { ConversationsService } from './conversations/conversations.service';
import { PrismaAiConversationRepository } from './conversations/repositories/prisma-ai-conversation.repository';
import { AI_CONVERSATION_REPOSITORY } from './conversations/repositories/ai-conversation.repository.interface';
import { PrismaAiMessageRepository } from './conversations/repositories/prisma-ai-message.repository';
import { AI_MESSAGE_REPOSITORY } from './conversations/repositories/ai-message.repository.interface';

import { InsightsController } from './insights/insights.controller';
import { InsightsService } from './insights/insights.service';

import { RecommendationsController } from './recommendations/recommendations.controller';
import { RecommendationsService } from './recommendations/recommendations.service';
import { PrismaAiRecommendationRepository } from './recommendations/repositories/prisma-ai-recommendation.repository';
import { AI_RECOMMENDATION_REPOSITORY } from './recommendations/repositories/ai-recommendation.repository.interface';

/**
 * The AI Intelligence Engine (PA-006, ADR-015) sits at the top of the
 * module dependency graph — it reads from every domain it orchestrates
 * (Opportunities, Resources, Journeys/Goals/Milestones, Academy, Knowledge)
 * plus Communication for notifications, and none of those import it back,
 * so no circular-dependency avoidance work was needed here (contrast
 * ADR-014 Decision 6's Academy/Stewardship cycle).
 */
@Module({
  imports: [
    AuthGuardsModule,
    AiProviderModule,
    CommunicationModule,
    OpportunitiesModule,
    ResourcesModule,
    JourneysModule,
    GoalsModule,
    MilestonesModule,
    AcademyModule,
    KnowledgeModule,
  ],
  controllers: [
    AiRequestsController,
    ConversationsController,
    InsightsController,
    RecommendationsController,
  ],
  providers: [
    AiRequestsService,
    { provide: AI_REQUEST_REPOSITORY, useClass: PrismaAiRequestRepository },
    ConversationsService,
    { provide: AI_CONVERSATION_REPOSITORY, useClass: PrismaAiConversationRepository },
    { provide: AI_MESSAGE_REPOSITORY, useClass: PrismaAiMessageRepository },
    InsightsService,
    RecommendationsService,
    { provide: AI_RECOMMENDATION_REPOSITORY, useClass: PrismaAiRecommendationRepository },
  ],
})
export class AiModule {}
