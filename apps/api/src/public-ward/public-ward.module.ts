import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CommunicationModule } from '../communication/communication.module';
import { BusinessTenantMembershipGuard } from '../organizations/guards/business-tenant-membership.guard';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BusinessWardLeadController } from './business-ward-lead.controller';
import { KitchenBathPublicController } from './kitchen-bath-public.controller';
import { KitchenBathPublicService } from './kitchen-bath-public.service';
import { PublicWardController } from './public-ward.controller';
import { PublicWardService } from './public-ward.service';
import { WardLeadService } from './ward-lead.service';

@Module({
  imports: [AiModule, AuthGuardsModule, CommunicationModule, OrganizationsModule],
  controllers: [PublicWardController, KitchenBathPublicController, BusinessWardLeadController],
  providers: [
    PublicWardService,
    WardLeadService,
    KitchenBathPublicService,
    BusinessTenantMembershipGuard,
  ],
  exports: [PublicWardService, WardLeadService, KitchenBathPublicService],
})
export class PublicWardModule {}
