import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CommunicationModule } from '../communication/communication.module';
import { BusinessTenantMembershipGuard } from '../organizations/guards/business-tenant-membership.guard';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ResponsibilitiesModule } from '../responsibilities/responsibilities.module';
import { BusinessLeadTransitionService } from './business-lead-transition.service';
import { BusinessRevenueCompletionService } from './business-revenue-completion.service';
import { BusinessWardLeadController } from './business-ward-lead.controller';
import { KitchenBathPublicController } from './kitchen-bath-public.controller';
import { KitchenBathPublicService } from './kitchen-bath-public.service';
import { PublicWardController } from './public-ward.controller';
import { PublicWardService } from './public-ward.service';
import { TelephonyContinuityController } from './telephony-continuity.controller';
import { TelephonyContinuityService } from './telephony-continuity.service';
import { WardLeadService } from './ward-lead.service';

@Module({
  imports: [
    AiModule,
    AuthGuardsModule,
    CommunicationModule,
    OrganizationsModule,
    ResponsibilitiesModule,
  ],
  controllers: [
    PublicWardController,
    KitchenBathPublicController,
    TelephonyContinuityController,
    BusinessWardLeadController,
  ],
  providers: [
    PublicWardService,
    WardLeadService,
    BusinessLeadTransitionService,
    BusinessRevenueCompletionService,
    KitchenBathPublicService,
    TelephonyContinuityService,
    BusinessTenantMembershipGuard,
  ],
  exports: [
    PublicWardService,
    WardLeadService,
    BusinessLeadTransitionService,
    BusinessRevenueCompletionService,
    KitchenBathPublicService,
    TelephonyContinuityService,
  ],
})
export class PublicWardModule {}
