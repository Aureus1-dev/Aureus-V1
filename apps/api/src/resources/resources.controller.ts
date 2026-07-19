import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { assertContentVisible } from '../common/utils/content-visibility.util';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { RejectResourceDto } from './dto/reject-resource.dto';
import { ResourceResponseDto } from './dto/resource-response.dto';
import { PaginatedResourcesResponseDto } from './dto/paginated-resources-response.dto';

const CREATOR_ROLES = [
  UserRole.STEWARD,
  UserRole.ORGANIZATION_REPRESENTATIVE,
  UserRole.BUSINESS_REPRESENTATIVE,
  UserRole.PLATFORM_ADMINISTRATOR,
];
const MODERATOR_ROLES = [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR];

@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CREATOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a resource listing (Steward / Org / Business / Admin)' })
  @ApiResponse({ status: 201, type: ResourceResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  create(
    @Body() dto: CreateResourceDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResourceResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List/search resources (default: VERIFIED only)' })
  @ApiResponse({ status: 200, type: PaginatedResourcesResponseDto })
  findAll(@Query() q: ListResourcesQueryDto): Promise<PaginatedResourcesResponseDto> {
    return this.service.findAll(q);
  }

  @Get('by-ref/:ref')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get resource by stable reference (e.g. AUR-RES-000001)' })
  @ApiParam({ name: 'ref', example: 'AUR-RES-000001' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  async findByRef(@Param('ref') ref: string, @CurrentUser() caller?: AuthenticatedUser): Promise<ResourceResponseDto> {
    const resource = await this.service.findByRef(ref);
    assertContentVisible(resource.verificationStatus, caller, MODERATOR_ROLES, `Resource '${ref}' not found`);
    return resource;
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get resource by UUID' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  async findOne(@Param('id') id: string, @CurrentUser() caller?: AuthenticatedUser): Promise<ResourceResponseDto> {
    const resource = await this.service.findById(id);
    assertContentVisible(resource.verificationStatus, caller, MODERATOR_ROLES, `Resource '${id}' not found`);
    return resource;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a resource (owning organization, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not own this resource or hold a moderation role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateResourceDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResourceResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a resource (owning organization, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not own this resource or hold a moderation role' })
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
  @ApiOperation({ summary: 'Submit DRAFT → PENDING_REVIEW (owning organization, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not own this resource or hold a moderation role' })
  @ApiResponse({ status: 409, description: 'Resource is not in DRAFT status' })
  submitForReview(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResourceResponseDto> {
    return this.service.submitForReview(id, caller);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MODERATOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify PENDING_REVIEW → VERIFIED (Steward / Admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Resource is not in PENDING_REVIEW status' })
  verify(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResourceResponseDto> {
    return this.service.verify(id, caller);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MODERATOR_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject PENDING_REVIEW → REJECTED (Steward / Admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Resource is not in PENDING_REVIEW status' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectResourceDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResourceResponseDto> {
    return this.service.reject(id, dto, caller);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a resource (owning organization, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not own this resource or hold a moderation role' })
  archive(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ResourceResponseDto> {
    return this.service.archive(id, caller);
  }
}
