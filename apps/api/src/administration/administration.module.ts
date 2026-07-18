import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { UsersModule } from '../users/users.module';
import { ResourcesModule } from '../resources/resources.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { AcademyModule } from '../academy/academy.module';
import { StewardshipModule } from '../stewardship/stewardship.module';
import { AiModule } from '../ai/ai.module';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';
import { AdministrationMetricsController } from './metrics/administration-metrics.controller';
import { AdministrationMetricsService } from './metrics/administration-metrics.service';

/**
 * Administration & Operations (PA-020). Starts with role management
 * (WO-021); the Founder Operating System's institutional health metrics
 * (PR-003) extend this module rather than being scattered across domain
 * modules. Future administrative capabilities (system configuration,
 * moderation oversight, access reviews per OAS-SEC-003) follow the same
 * pattern.
 */
@Module({
  imports: [
    AuthGuardsModule,
    UsersModule,
    ResourcesModule,
    OrganizationsModule,
    OpportunitiesModule,
    KnowledgeModule,
    AcademyModule,
    StewardshipModule,
    AiModule,
  ],
  controllers: [UserRolesController, AdministrationMetricsController],
  providers: [UserRolesService, AdministrationMetricsService],
})
export class AdministrationModule {}
