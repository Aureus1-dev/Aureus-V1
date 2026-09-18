import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { HouseholdContinuityController } from './household-continuity.controller';
import { HouseholdContinuityService } from './household-continuity.service';

@Module({
  imports: [AuthGuardsModule],
  controllers: [HouseholdContinuityController],
  providers: [HouseholdContinuityService],
  exports: [HouseholdContinuityService],
})
export class HouseholdContinuityModule {}
