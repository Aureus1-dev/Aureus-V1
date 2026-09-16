import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { BusinessTenantMembershipGuard } from '../organizations/guards/business-tenant-membership.guard';
import { BusinessRevenueCompletionService } from './business-revenue-completion.service';
import { AssignWardLeadDto } from './dto/assign-ward-lead.dto';
import { ListWardLeadsQueryDto } from './dto/list-ward-leads-query.dto';
import { RecordRevenueMilestoneDto } from './dto/record-revenue-milestone.dto';
import { TransitionWardLeadDto } from './dto/transition-ward-lead.dto';
import { WardLeadService } from './ward-lead.service';

@ApiTags('business-leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BusinessTenantMembershipGuard)
@Controller('organizations/:organizationId/business-leads')
export class BusinessWardLeadController {
  constructor(
    private readonly leads: WardLeadService,
    private readonly revenueCompletion: BusinessRevenueCompletionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the current consented handoffs for this tenant' })
  @ApiParam({ name: 'organizationId', description: 'Canonical tenant UUID' })
  list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListWardLeadsQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.leads.listBusinessLeads(organizationId, query, caller);
  }

  @Get(':leadId')
  @ApiOperation({ summary: 'Read one handoff with its attributed conversation and audit history' })
  get(
    @Param('organizationId') organizationId: string,
    @Param('leadId') leadId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.leads.getBusinessLead(organizationId, leadId, caller);
  }

  @Patch(':leadId/assignment')
  @ApiOperation({ summary: 'Assign a handoff to an eligible member of this same tenant' })
  assign(
    @Param('organizationId') organizationId: string,
    @Param('leadId') leadId: string,
    @Body() dto: AssignWardLeadDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.leads.assignBusinessLead(organizationId, leadId, dto, caller);
  }

  @Patch(':leadId/status')
  @ApiOperation({ summary: 'Record a human acceptance, contact, close, or loss outcome' })
  transition(
    @Param('organizationId') organizationId: string,
    @Param('leadId') leadId: string,
    @Body() dto: TransitionWardLeadDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.leads.transitionBusinessLead(organizationId, leadId, dto, caller);
  }

  @Post(':leadId/revenue-milestones')
  @ApiOperation({
    summary:
      'Record one tenant-scoped reported revenue milestone without executing signatures, payments, or autonomous closing',
  })
  recordRevenueMilestone(
    @Param('organizationId') organizationId: string,
    @Param('leadId') leadId: string,
    @Body() dto: RecordRevenueMilestoneDto,
    @CurrentUser() caller: AuthenticatedUser,
  ) {
    return this.revenueCompletion.record(organizationId, leadId, dto, caller);
  }
}
