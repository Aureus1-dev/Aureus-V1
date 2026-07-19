import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { assertContentVisible } from '../common/utils/content-visibility.util';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto';
import { RejectOrganizationDto } from './dto/reject-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { PaginatedOrganizationsResponseDto } from './dto/paginated-organizations-response.dto';

const CREATOR_ROLES = [
  UserRole.STEWARD,
  UserRole.ORGANIZATION_REPRESENTATIVE,
  UserRole.BUSINESS_REPRESENTATIVE,
  UserRole.PLATFORM_ADMINISTRATOR,
];
const MODERATOR_ROLES = [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR];

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CREATOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an organization profile (Steward / Org / Business / Admin); creator becomes its first ADMIN representative' })
  @ApiResponse({ status: 201, type: OrganizationResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List/search organizations (default: VERIFIED only)' })
  @ApiResponse({ status: 200, type: PaginatedOrganizationsResponseDto })
  findAll(@Query() q: ListOrganizationsQueryDto): Promise<PaginatedOrganizationsResponseDto> {
    return this.service.findAll(q);
  }

  @Get('by-ref/:ref')
  @ApiOperation({ summary: 'Get organization by stable reference (e.g. AUR-ORG-000001)' })
  @ApiParam({ name: 'ref', example: 'AUR-ORG-000001' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  async findByRef(@Param('ref') ref: string, @CurrentUser() caller?: AuthenticatedUser): Promise<OrganizationResponseDto> {
    const org = await this.service.findByRef(ref);
    assertContentVisible(org.verificationStatus, caller, MODERATOR_ROLES, `Organization '${ref}' not found`);
    return org;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by UUID' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  async findOne(@Param('id') id: string, @CurrentUser() caller?: AuthenticatedUser): Promise<OrganizationResponseDto> {
    const org = await this.service.findById(id);
    assertContentVisible(org.verificationStatus, caller, MODERATOR_ROLES, `Organization '${id}' not found`);
    return org;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an organization (ADMIN representative, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not have management authority over this organization' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an organization (ADMIN representative, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not have management authority over this organization' })
  remove(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    return this.service.remove(id, caller);
  }

  // ── Verification Workflow ────────────────────────────────────────────

  @Post(':id/submit-for-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit DRAFT → PENDING_REVIEW (ADMIN representative, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not have management authority over this organization' })
  @ApiResponse({ status: 409, description: 'Organization is not in DRAFT status' })
  submitForReview(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    return this.service.submitForReview(id, caller);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MODERATOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify PENDING_REVIEW → VERIFIED (Steward / Admin only)' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Organization is not in PENDING_REVIEW status' })
  verify(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    return this.service.verify(id, caller);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MODERATOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject PENDING_REVIEW → REJECTED (Steward / Admin only)' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Organization is not in PENDING_REVIEW status' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectOrganizationDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    return this.service.reject(id, dto, caller);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive an organization (ADMIN representative, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not have management authority over this organization' })
  archive(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    return this.service.archive(id, caller);
  }
}
