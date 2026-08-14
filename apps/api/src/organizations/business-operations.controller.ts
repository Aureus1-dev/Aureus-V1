import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { BusinessOperationsService } from './business-operations.service';
import { BusinessTenantMembershipGuard } from './guards/business-tenant-membership.guard';

@ApiTags('business-operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BusinessTenantMembershipGuard)
@Controller('organizations/:organizationId/business-operations')
export class BusinessOperationsController {
  constructor(private readonly service: BusinessOperationsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Observed tenant-scoped inbox, routing, knowledge, provider health, and spend' })
  summary(@Param('organizationId') organizationId: string) {
    return this.service.getSummary(organizationId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export a bounded tenant-scoped operational snapshot' })
  exportSnapshot(
    @Param('organizationId') organizationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.service.exportSnapshot(organizationId, caller);
  }
}
