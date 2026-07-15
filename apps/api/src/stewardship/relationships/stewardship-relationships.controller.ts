import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { StewardshipRelationshipsService } from './stewardship-relationships.service';
import { RequestStewardDto } from './dto/request-steward.dto';
import { RecommendStewardDto } from './dto/recommend-steward.dto';
import { OrganizationAssignStewardDto } from './dto/organization-assign-steward.dto';
import { AdminAssignStewardDto } from './dto/admin-assign-steward.dto';
import { ActivateRelationshipDto } from './dto/activate-relationship.dto';
import { EndRelationshipDto } from './dto/end-relationship.dto';
import { ReassignRelationshipDto } from './dto/reassign-relationship.dto';
import { ListRelationshipsQueryDto } from './dto/list-relationships-query.dto';
import { RelationshipResponseDto } from './dto/relationship-response.dto';
import { PaginatedRelationshipsResponseDto } from './dto/paginated-relationships-response.dto';
import { MemberOverviewResponseDto } from './dto/member-overview-response.dto';

@ApiTags('stewardship')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stewardship/relationships')
export class StewardshipRelationshipsController {
  constructor(private readonly service: StewardshipRelationshipsService) {}

  // ── Creation flows (literal routes — must precede `:id`) ─────────────

  @Post('request')
  @ApiOperation({ summary: 'Request a steward for yourself (Member)' })
  @ApiResponse({ status: 201, type: RelationshipResponseDto })
  request(@Body() dto: RequestStewardDto, @CurrentUser() caller: AuthenticatedUser): Promise<RelationshipResponseDto> {
    return this.service.requestSteward(dto, caller);
  }

  @Post('recommend')
  @ApiOperation({ summary: 'Recommend a steward for a member — never auto-activates (AI service account only)' })
  @ApiResponse({ status: 201, type: RelationshipResponseDto })
  @ApiResponse({ status: 403, description: 'Only an AI service account may recommend a steward' })
  recommend(
    @Body() dto: RecommendStewardDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RelationshipResponseDto> {
    return this.service.recommendSteward(dto, caller);
  }

  @Post('assign-by-organization')
  @ApiOperation({ summary: 'Assign a steward to a member, effective immediately (Organization ADMIN representative)' })
  @ApiResponse({ status: 201, type: RelationshipResponseDto })
  @ApiResponse({ status: 403, description: 'You must be an ADMIN representative of a verified organization' })
  @ApiResponse({ status: 409, description: 'Steward is at capacity' })
  assignByOrganization(
    @Body() dto: OrganizationAssignStewardDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RelationshipResponseDto> {
    return this.service.assignByOrganization(dto, caller);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign a steward to a member, effective immediately (Platform/System Administrator)' })
  @ApiResponse({ status: 201, type: RelationshipResponseDto })
  @ApiResponse({ status: 403, description: 'Only a Platform/System Administrator may perform this action' })
  @ApiResponse({ status: 409, description: 'Steward is at capacity' })
  assign(
    @Body() dto: AdminAssignStewardDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RelationshipResponseDto> {
    return this.service.assignByAdmin(dto, caller);
  }

  // ── Read ──────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List relationships (self-scoped by memberId or stewardId unless Administrator)' })
  @ApiResponse({ status: 200, type: PaginatedRelationshipsResponseDto })
  findAll(
    @Query() query: ListRelationshipsQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedRelationshipsResponseDto> {
    return this.service.findAll(query, caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a relationship by ID (member, steward, org ADMIN representative, or Administrator)' })
  @ApiParam({ name: 'id', description: 'Relationship UUID' })
  @ApiResponse({ status: 200, type: RelationshipResponseDto })
  @ApiResponse({ status: 404, description: 'Relationship not found' })
  findOne(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<RelationshipResponseDto> {
    return this.service.findById(id, caller);
  }

  @Get(':id/member-overview')
  @ApiOperation({ summary: "The assigned steward's read-only view of the member's profile, goals, journeys, milestones, and tasks" })
  @ApiParam({ name: 'id', description: 'Relationship UUID' })
  @ApiResponse({ status: 200, type: MemberOverviewResponseDto })
  @ApiResponse({ status: 403, description: 'Only the assigned steward may view this member overview' })
  memberOverview(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MemberOverviewResponseDto> {
    return this.service.getMemberOverview(id, caller);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  @Post(':id/activate')
  @ApiOperation({ summary: 'Confirm a PENDING relationship into ACTIVE (Organization ADMIN representative or Administrator)' })
  @ApiParam({ name: 'id', description: 'Relationship UUID' })
  @ApiResponse({ status: 200, type: RelationshipResponseDto })
  @ApiResponse({ status: 409, description: 'Relationship is not PENDING, or the steward is at capacity' })
  activate(
    @Param('id') id: string,
    @Body() dto: ActivateRelationshipDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RelationshipResponseDto> {
    return this.service.activate(id, dto, caller);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a relationship with a reason (authority depends on the reason — see PA-012)' })
  @ApiParam({ name: 'id', description: 'Relationship UUID' })
  @ApiResponse({ status: 200, type: RelationshipResponseDto })
  @ApiResponse({ status: 409, description: 'Relationship has already ended' })
  end(
    @Param('id') id: string,
    @Body() dto: EndRelationshipDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RelationshipResponseDto> {
    return this.service.end(id, dto, caller);
  }

  @Post(':id/reassign')
  @ApiOperation({ summary: 'End the current relationship and immediately assign a new steward (Organization ADMIN representative or Administrator)' })
  @ApiParam({ name: 'id', description: 'Relationship UUID' })
  @ApiResponse({ status: 201, type: RelationshipResponseDto })
  reassign(
    @Param('id') id: string,
    @Body() dto: ReassignRelationshipDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RelationshipResponseDto> {
    return this.service.reassign(id, dto, caller);
  }
}
