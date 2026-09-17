import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { NeedsModule } from '../needs/needs.module';
import { ResponsibilitiesModule } from '../responsibilities/responsibilities.module';
import {
  LegalMattersController,
  LegalMattersInternalController,
} from './legal-matters.controller';
import { LegalMattersService } from './legal-matters.service';

@Module({
  imports: [AuthGuardsModule, NeedsModule, ResponsibilitiesModule],
  controllers: [LegalMattersController, LegalMattersInternalController],
  providers: [LegalMattersService],
  exports: [LegalMattersService],
})
export class LegalMattersModule {}
