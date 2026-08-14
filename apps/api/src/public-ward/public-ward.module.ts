import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CommunicationModule } from '../communication/communication.module';
import { BusinessWardLeadController } from './business-ward-lead.controller';
import { PublicWardController } from './public-ward.controller';
import { PublicWardService } from './public-ward.service';
import { WardLeadService } from './ward-lead.service';

@Module({
  imports: [AiModule, AuthGuardsModule, CommunicationModule],
  controllers: [PublicWardController, BusinessWardLeadController],
  providers: [PublicWardService, WardLeadService],
  exports: [PublicWardService, WardLeadService],
})
export class PublicWardModule {}
