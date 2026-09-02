import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { ResponsibilitiesModule } from '../responsibilities/responsibilities.module';
import { PeopleHelpController } from './people-help.controller';
import { PeopleHelpService } from './people-help.service';

@Module({
  imports: [
    AuthGuardsModule,
    AiModule,
    OpportunitiesModule,
    ResponsibilitiesModule,
  ],
  controllers: [PeopleHelpController],
  providers: [PeopleHelpService],
})
export class PeopleHelpModule {}
