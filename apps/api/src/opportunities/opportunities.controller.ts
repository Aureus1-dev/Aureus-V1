import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { assertContentVisible } from '../common/utils/content-visibility.util';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { ListOpportunitiesQueryDto } from './dto/list-opportunities-query.dto';
import { RejectOpportunityDto } from './dto/reject-opportunity.dto';
import { VerifyOpportunityDto } from './dto/verify-opportunity.dto';
import { OpportunityResponseDto } from './dto/opportunity-response.dto';
import { PaginatedOpportunitiesResponseDto } from './dto/paginated-opportunities-response.dto';

const MODERATOR_ROLES = [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR];

@ApiTags('opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.STEWARD,
    UserRole.ORGANIZATION_REPRESENTATIVE,
    UserRole.BUSINESS_REPRESENTATIVE,
    UserRole.PLATFORM_ADMINISTRATOR,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an opportunity (Steward / Org / Business / Admin)' })
  @ApiResponse({ status: 201, type: OpportunityResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  create(@Body() dto: CreateOpportunityDto): Promise<OpportunityResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List/search opportunities (default: VERIFIED only)' })
  @ApiResponse({ status: 200, type: PaginatedOpportunitiesResponseDto })
  findAll(@Query() q: ListOpportunitiesQueryDto): Promise<PaginatedOpportunitiesResponseDto> {
    return this.service.findAll(q);
  }

  @Get('by-ref/:ref')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get opportunity by stable reference (e.g. AUR-OPP-000001)' })
  @ApiParam({ name: 'ref', example: 'AUR-OPP-000001' })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  async findByRef(@Param('ref') ref: string, @CurrentUser() caller?: AuthenticatedUser): Promise<OpportunityResponseDto> {
    const opp = await this.service.findByRef(ref);
    assertContentVisible(opp.verificationStatus, caller, MODERATOR_ROLES, `Opportunity '${ref}' not found`);
    return opp;
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get opportunity by UUID' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  async findOne(@Param('id') id: string, @CurrentUser() caller?: AuthenticatedUser): Promise<OpportunityResponseDto> {
    const opp = await this.service.findById(id);
    assertContentVisible(opp.verificationStatus, caller, MODERATOR_ROLES, `Opportunity '${id}' not found`);
    return opp;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an opportunity (Steward / Admin)' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  update(@Param('id') id: string, @Body() dto: UpdateOpportunityDto): Promise<OpportunityResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMINISTRATOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an opportunity (Admin)' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }

  // ── Verification Workflow ─────────────────────────────────────────────────

  @Post(':id/submit-for-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.STEWARD,
    UserRole.ORGANIZATION_REPRESENTATIVE,
    UserRole.BUSINESS_REPRESENTATIVE,
    UserRole.PLATFORM_ADMINISTRATOR,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit DRAFT → PENDING_REVIEW' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiBody({ schema: { properties: { submittedById: { type: 'string' } }, required: ['submittedById'] } })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  submitForReview(
    @Param('id') id: string,
    @Body('submittedById') submittedById: string,
  ): Promise<OpportunityResponseDto> {
    return this.service.submitForReview(id, submittedById);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify PENDING_REVIEW → VERIFIED (Steward / Admin only)' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyOpportunityDto,
  ): Promise<OpportunityResponseDto> {
    return this.service.verify(id, dto);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject PENDING_REVIEW → REJECTED (Steward / Admin only)' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectOpportunityDto,
  ): Promise<OpportunityResponseDto> {
    return this.service.reject(id, dto);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive an opportunity (Steward / Admin)' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiBody({ schema: { properties: { archivedById: { type: 'string' } }, required: ['archivedById'] } })
  @ApiResponse({ status: 200, type: OpportunityResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  archive(
    @Param('id') id: string,
    @Body('archivedById') archivedById: string,
  ): Promise<OpportunityResponseDto> {
    return this.service.archive(id, archivedById);
  }
}
