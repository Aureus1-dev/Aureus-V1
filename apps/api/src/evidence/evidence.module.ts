import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuthorityModule } from '../authority/authority.module';
import { ResponsibilitiesModule } from '../responsibilities/responsibilities.module';
import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';

@Module({
  imports: [AuthGuardsModule, AuthorityModule, ResponsibilitiesModule],
  controllers: [EvidenceController],
  providers: [EvidenceService],
  exports: [EvidenceService],
})
export class EvidenceModule {}
