import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { NeedsModule } from '../needs/needs.module';
import { ResponsibilitiesModule } from '../responsibilities/responsibilities.module';
import { PeopleResolutionsController } from './people-resolutions.controller';
import { PeopleResolutionsService } from './people-resolutions.service';

@Module({
  imports: [AuthGuardsModule, NeedsModule, ResponsibilitiesModule],
  controllers: [PeopleResolutionsController],
  providers: [PeopleResolutionsService],
  exports: [PeopleResolutionsService],
})
export class PeopleResolutionsModule {}
