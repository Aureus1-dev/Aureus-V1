import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { PrismaResourceRepository } from './repositories/prisma-resource.repository';
import { RESOURCE_REPOSITORY } from './repositories/resource.repository.interface';
import { ResourceScoringService } from './scoring/resource-scoring.service';
import { SavedResourcesController } from './saved/saved-resources.controller';
import { SavedResourcesService } from './saved/saved-resources.service';
import { PrismaSavedResourceRepository } from './saved/repositories/prisma-saved-resource.repository';
import { SAVED_RESOURCE_REPOSITORY } from './saved/repositories/saved-resource.repository.interface';

@Module({
  imports: [AuthGuardsModule],
  controllers: [ResourcesController, SavedResourcesController],
  providers: [
    ResourcesService,
    ResourceScoringService,
    { provide: RESOURCE_REPOSITORY, useClass: PrismaResourceRepository },
    SavedResourcesService,
    { provide: SAVED_RESOURCE_REPOSITORY, useClass: PrismaSavedResourceRepository },
  ],
  exports: [ResourcesService, SavedResourcesService, ResourceScoringService],
})
export class ResourcesModule {}
