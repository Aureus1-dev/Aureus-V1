import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';
import { PrismaOpportunityRepository } from './repositories/prisma-opportunity.repository';
import { OPPORTUNITY_REPOSITORY } from './repositories/opportunity.repository.interface';
import { OpportunityScoringService } from './scoring/opportunity-scoring.service';
import { SavedOpportunitiesController } from './saved/saved-opportunities.controller';
import { SavedOpportunitiesService } from './saved/saved-opportunities.service';
import { PrismaSavedOpportunityRepository } from './saved/repositories/prisma-saved-opportunity.repository';
import { SAVED_OPPORTUNITY_REPOSITORY } from './saved/repositories/saved-opportunity.repository.interface';

@Module({
  imports: [AuthGuardsModule],
  controllers: [OpportunitiesController, SavedOpportunitiesController],
  providers: [
    OpportunitiesService,
    OpportunityScoringService,
    { provide: OPPORTUNITY_REPOSITORY,      useClass: PrismaOpportunityRepository },
    SavedOpportunitiesService,
    { provide: SAVED_OPPORTUNITY_REPOSITORY, useClass: PrismaSavedOpportunityRepository },
  ],
  exports: [OpportunitiesService, SavedOpportunitiesService, OpportunityScoringService],
})
export class OpportunitiesModule {}
