import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { WorkContractService } from './work-contract.service';

@Module({
  imports: [AuthGuardsModule],
  controllers: [FamilyController],
  providers: [FamilyService, WorkContractService],
  exports: [FamilyService, WorkContractService],
})
export class FamilyModule {}
