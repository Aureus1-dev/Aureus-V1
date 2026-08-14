import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { BusinessTenantMembershipGuard } from './guards/business-tenant-membership.guard';
import { BusinessTenantService } from './business-tenant.service';
import { UpsertBusinessProfileDto } from './dto/upsert-business-profile.dto';

@ApiTags('business-console')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BusinessTenantMembershipGuard)
@Controller('organizations/:organizationId/business-console')
export class BusinessTenantController {
  constructor(private readonly service: BusinessTenantService) {}

  @Get()
  @ApiOperation({ summary: 'Load the caller-scoped business tenant console' })
  @ApiParam({ name: 'organizationId', description: 'Canonical tenant UUID' })
  getConsole(
    @Param('organizationId') organizationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.getConsole(organizationId, caller);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Create or update the tenant business profile and onboarding state' })
  upsertProfile(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpsertBusinessProfileDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.upsertProfile(organizationId, dto, caller);
  }

  @Get('audit')
  @ApiOperation({ summary: 'List the latest append-only audit events for this tenant' })
  listAudit(
    @Param('organizationId') organizationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.listAudit(organizationId, caller);
  }
}

@ApiTags('business-console')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business-console')
export class BusinessTenantDirectoryController {
  constructor(private readonly service: BusinessTenantService) {}

  @Get('tenants')
  @ApiOperation({ summary: 'List business tenants represented by the caller' })
  listMyTenants(@CurrentUser() caller: AuthenticatedUser) {
    return this.service.listMyTenants(caller);
  }
}
