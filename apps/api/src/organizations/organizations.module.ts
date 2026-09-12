import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { PrismaOrganizationRepository } from './repositories/prisma-organization.repository';
import { ORGANIZATION_REPOSITORY } from './repositories/organization.repository.interface';
import { OrganizationMembersController } from './members/organization-members.controller';
import { OrganizationMembersService } from './members/organization-members.service';
import { PrismaOrganizationMemberRepository } from './members/repositories/prisma-organization-member.repository';
import { ORGANIZATION_MEMBER_REPOSITORY } from './members/repositories/organization-member.repository.interface';
import {
  BusinessTenantController,
  BusinessTenantDirectoryController,
} from './business-tenant.controller';
import { BusinessTenantService } from './business-tenant.service';
import { BusinessOperationsController } from './business-operations.controller';
import { BusinessOperationsService } from './business-operations.service';
import { BusinessTenantMembershipGuard } from './guards/business-tenant-membership.guard';
import { BusinessKnowledgeCorrectionService } from './knowledge/business-knowledge-correction.service';
import { BusinessKnowledgeController } from './knowledge/business-knowledge.controller';
import { BusinessKnowledgeService } from './knowledge/business-knowledge.service';
import { KitchenBathVerticalController } from './kitchen-bath-vertical.controller';
import { KitchenBathVerticalService } from './kitchen-bath-vertical.service';
import {
  OrganizationInvitationsController,
  MyInvitationsController,
} from './invitations/organization-invitations.controller';
import { OrganizationInvitationsService } from './invitations/organization-invitations.service';
import { PrismaOrganizationInvitationRepository } from './invitations/repositories/prisma-organization-invitation.repository';
import { ORGANIZATION_INVITATION_REPOSITORY } from './invitations/repositories/organization-invitation.repository.interface';

@Module({
  imports: [AuthGuardsModule],
  controllers: [
    OrganizationsController,
    OrganizationMembersController,
    OrganizationInvitationsController,
    MyInvitationsController,
    BusinessTenantController,
    BusinessTenantDirectoryController,
    BusinessOperationsController,
    BusinessKnowledgeController,
    KitchenBathVerticalController,
  ],
  providers: [
    OrganizationsService,
    BusinessTenantService,
    BusinessOperationsService,
    BusinessTenantMembershipGuard,
    BusinessKnowledgeService,
    BusinessKnowledgeCorrectionService,
    KitchenBathVerticalService,
    { provide: ORGANIZATION_REPOSITORY, useClass: PrismaOrganizationRepository },
    OrganizationMembersService,
    { provide: ORGANIZATION_MEMBER_REPOSITORY, useClass: PrismaOrganizationMemberRepository },
    OrganizationInvitationsService,
    {
      provide: ORGANIZATION_INVITATION_REPOSITORY,
      useClass: PrismaOrganizationInvitationRepository,
    },
  ],
  exports: [
    OrganizationsService,
    OrganizationMembersService,
    OrganizationInvitationsService,
    BusinessTenantService,
    BusinessOperationsService,
    BusinessTenantMembershipGuard,
    BusinessKnowledgeService,
    BusinessKnowledgeCorrectionService,
    KitchenBathVerticalService,
    ORGANIZATION_REPOSITORY,
    ORGANIZATION_MEMBER_REPOSITORY,
    ORGANIZATION_INVITATION_REPOSITORY,
  ],
})
export class OrganizationsModule {}
