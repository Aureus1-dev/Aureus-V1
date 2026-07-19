import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ACADEMY_STAFF_ROLES } from '../common/academy-roles.util';
import { assertContentVisible } from '../../common/utils/content-visibility.util';
import { LearningPathsService } from './learning-paths.service';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { UpdateLearningPathDto } from './dto/update-learning-path.dto';
import { ListLearningPathsQueryDto } from './dto/list-learning-paths-query.dto';
import { RejectLearningPathDto } from './dto/reject-learning-path.dto';
import { LearningPathResponseDto } from './dto/learning-path-response.dto';
import { PaginatedLearningPathsResponseDto } from './dto/paginated-learning-paths-response.dto';

@ApiTags('academy')
@Controller('academy/learning-paths')
export class LearningPathsController {
  constructor(private readonly service: LearningPathsService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a learning path (Steward / Admin)' })
  @ApiResponse({ status: 201, type: LearningPathResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  create(
    @Body() dto: CreateLearningPathDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<LearningPathResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List/search learning paths (default: VERIFIED only)' })
  @ApiResponse({ status: 200, type: PaginatedLearningPathsResponseDto })
  findAll(@Query() q: ListLearningPathsQueryDto): Promise<PaginatedLearningPathsResponseDto> {
    return this.service.findAll(q);
  }

  @Get('by-ref/:ref')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a learning path by stable reference (e.g. AUR-LP-000001)' })
  @ApiParam({ name: 'ref', example: 'AUR-LP-000001' })
  @ApiResponse({ status: 200, type: LearningPathResponseDto })
  async findByRef(@Param('ref') ref: string, @CurrentUser() caller?: AuthenticatedUser): Promise<LearningPathResponseDto> {
    const path = await this.service.findByRef(ref);
    assertContentVisible(path.verificationStatus, caller, ACADEMY_STAFF_ROLES, `Learning path '${ref}' not found`);
    return path;
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a learning path by UUID' })
  @ApiParam({ name: 'id', description: 'Learning path UUID' })
  @ApiResponse({ status: 200, type: LearningPathResponseDto })
  async findOne(@Param('id') id: string, @CurrentUser() caller?: AuthenticatedUser): Promise<LearningPathResponseDto> {
    const path = await this.service.findById(id);
    assertContentVisible(path.verificationStatus, caller, ACADEMY_STAFF_ROLES, `Learning path '${id}' not found`);
    return path;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a learning path (author, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Learning path UUID' })
  @ApiResponse({ status: 200, type: LearningPathResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this learning path or hold a moderation role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLearningPathDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<LearningPathResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a learning path (author, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Learning path UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this learning path or hold a moderation role' })
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
  @ApiOperation({ summary: 'Submit DRAFT → PENDING_REVIEW (author, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Learning path UUID' })
  @ApiResponse({ status: 200, type: LearningPathResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this learning path or hold a moderation role' })
  @ApiResponse({ status: 409, description: 'Learning path is not in DRAFT status' })
  submitForReview(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<LearningPathResponseDto> {
    return this.service.submitForReview(id, caller);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify PENDING_REVIEW → VERIFIED (Steward / Admin only) — notifies the author' })
  @ApiParam({ name: 'id', description: 'Learning path UUID' })
  @ApiResponse({ status: 200, type: LearningPathResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Learning path is not in PENDING_REVIEW status' })
  verify(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<LearningPathResponseDto> {
    return this.service.verify(id, caller);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject PENDING_REVIEW → REJECTED (Steward / Admin only) — notifies the author' })
  @ApiParam({ name: 'id', description: 'Learning path UUID' })
  @ApiResponse({ status: 200, type: LearningPathResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Learning path is not in PENDING_REVIEW status' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectLearningPathDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<LearningPathResponseDto> {
    return this.service.reject(id, dto, caller);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a learning path (author, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Learning path UUID' })
  @ApiResponse({ status: 200, type: LearningPathResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this learning path or hold a moderation role' })
  archive(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<LearningPathResponseDto> {
    return this.service.archive(id, caller);
  }
}
