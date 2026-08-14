import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { BusinessTenantMembershipGuard } from './guards/business-tenant-membership.guard';
import { KitchenBathVerticalService } from './kitchen-bath-vertical.service';

@ApiTags('kitchen-bath-vertical')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BusinessTenantMembershipGuard)
@Controller('organizations/:organizationId/kitchen-bath-pack')
export class KitchenBathVerticalController {
  constructor(private readonly vertical: KitchenBathVerticalService) {}

  @Get()
  @ApiOperation({ summary: 'Inspect the governed Kitchen & Bath pack for this tenant' })
  get(@Param('organizationId') organizationId: string) {
    return this.vertical.getPack(organizationId);
  }

  @Post('install')
  @ApiOperation({ summary: 'Install missing Kitchen & Bath templates as DRAFT knowledge only' })
  install(
    @Param('organizationId') organizationId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.vertical.installDraftPack(organizationId, caller);
  }
}
