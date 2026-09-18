import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CommunicationModule } from '../communication/communication.module';
import { NeedsModule } from '../needs/needs.module';
import { ResponsibilitiesModule } from '../responsibilities/responsibilities.module';
import { StewardshipModule } from '../stewardship/stewardship.module';
import { PeopleFollowThroughController } from './people-follow-through.controller';
import { PeopleFollowThroughService } from './people-follow-through.service';
import { PeopleResolutionsController } from './people-resolutions.controller';
import { PeopleResolutionsService } from './people-resolutions.service';

@Module({
  imports: [
    AuthGuardsModule,
    NeedsModule,
    ResponsibilitiesModule,
    CommunicationModule,
    StewardshipModule,
  ],
  controllers: [PeopleResolutionsController, PeopleFollowThroughController],
  providers: [PeopleResolutionsService, PeopleFollowThroughService],
  exports: [PeopleResolutionsService, PeopleFollowThroughService],
})
export class PeopleResolutionsModule {}
