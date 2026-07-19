import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ACADEMY_STAFF_ROLES } from '../common/academy-roles.util';
import { assertContentVisible } from '../../common/utils/content-visibility.util';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import { RejectCourseDto } from './dto/reject-course.dto';
import { CourseResponseDto } from './dto/course-response.dto';
import { PaginatedCoursesResponseDto } from './dto/paginated-courses-response.dto';
import { CourseRevisionResponseDto } from './dto/revision-response.dto';

@ApiTags('academy')
@Controller('academy/courses')
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a course (Steward / Admin)' })
  @ApiResponse({ status: 201, type: CourseResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CourseResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List/search courses (default: VERIFIED only)' })
  @ApiResponse({ status: 200, type: PaginatedCoursesResponseDto })
  findAll(@Query() q: ListCoursesQueryDto): Promise<PaginatedCoursesResponseDto> {
    return this.service.findAll(q);
  }

  @Get('by-ref/:ref')
  @ApiOperation({ summary: 'Get a course by stable reference (e.g. AUR-CRS-000001)' })
  @ApiParam({ name: 'ref', example: 'AUR-CRS-000001' })
  @ApiResponse({ status: 200, type: CourseResponseDto })
  async findByRef(@Param('ref') ref: string, @CurrentUser() caller?: AuthenticatedUser): Promise<CourseResponseDto> {
    const course = await this.service.findByRef(ref);
    assertContentVisible(course.verificationStatus, caller, ACADEMY_STAFF_ROLES, `Course '${ref}' not found`);
    return course;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by UUID' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, type: CourseResponseDto })
  async findOne(@Param('id') id: string, @CurrentUser() caller?: AuthenticatedUser): Promise<CourseResponseDto> {
    const course = await this.service.findById(id);
    assertContentVisible(course.verificationStatus, caller, ACADEMY_STAFF_ROLES, `Course '${id}' not found`);
    return course;
  }

  @Get(':id/revisions')
  @ApiOperation({ summary: "Get a course's revision history, newest first" })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, type: [CourseRevisionResponseDto] })
  findRevisions(@Param('id') id: string): Promise<CourseRevisionResponseDto[]> {
    return this.service.findRevisions(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course (author, Steward, or Admin) — a substantive edit creates a revision snapshot' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, type: CourseResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CourseResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a course (author, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
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
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, type: CourseResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
  @ApiResponse({ status: 409, description: 'Course is not in DRAFT status' })
  submitForReview(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CourseResponseDto> {
    return this.service.submitForReview(id, caller);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify PENDING_REVIEW → VERIFIED (Steward / Admin only) — notifies the author' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, type: CourseResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Course is not in PENDING_REVIEW status' })
  verify(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CourseResponseDto> {
    return this.service.verify(id, caller);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject PENDING_REVIEW → REJECTED (Steward / Admin only) — notifies the author' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, type: CourseResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not hold a required role' })
  @ApiResponse({ status: 409, description: 'Course is not in PENDING_REVIEW status' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectCourseDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CourseResponseDto> {
    return this.service.reject(id, dto, caller);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a course (author, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, type: CourseResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
  archive(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CourseResponseDto> {
    return this.service.archive(id, caller);
  }
}
