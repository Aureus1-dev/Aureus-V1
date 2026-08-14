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
import { BusinessTenantMembershipGuard } from './guards/business-tenant-membership.guard';
import { BusinessKnowledgeController } from './knowledge/business-knowledge.controller';
import { BusinessKnowledgeService } from './knowledge/business-knowledge.service';

@Module({
  imports: [AuthGuardsModule],
  controllers: [
    OrganizationsController,
    OrganizationMembersController,
    BusinessTenantController,
    BusinessTenantDirectoryController,
    BusinessKnowledgeController,
  ],
  providers: [
    OrganizationsService,
    BusinessTenantService,
    BusinessTenantMembershipGuard,
    BusinessKnowledgeService,
    { provide: ORGANIZATION_REPOSITORY, useClass: PrismaOrganizationRepository },
    OrganizationMembersService,
    { provide: ORGANIZATION_MEMBER_REPOSITORY, useClass: PrismaOrganizationMemberRepository },
  ],
  exports: [
    OrganizationsService,
    OrganizationMembersService,
    BusinessTenantService,
    BusinessTenantMembershipGuard,
    BusinessKnowledgeService,
    ORGANIZATION_REPOSITORY,
    ORGANIZATION_MEMBER_REPOSITORY,
  ],
})
export class OrganizationsModule {}
