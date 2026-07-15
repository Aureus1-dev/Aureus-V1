import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ACADEMY_STAFF_ROLES } from '../common/academy-roles.util';
import { PathCoursesService } from './path-courses.service';
import { AddPathCourseDto } from './dto/add-path-course.dto';
import { ReorderPathCourseDto } from './dto/reorder-path-course.dto';
import { PathCourseResponseDto } from './dto/path-course-response.dto';

@ApiTags('academy')
@Controller('academy/learning-paths/:learningPathId/courses')
export class PathCoursesController {
  constructor(private readonly service: PathCoursesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a course to a learning path, at a given position (path author, Steward, or Admin)' })
  @ApiParam({ name: 'learningPathId', description: 'Learning path UUID' })
  @ApiResponse({ status: 201, type: PathCourseResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this learning path or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Learning path or course not found' })
  @ApiResponse({ status: 409, description: 'Course is already part of the learning path' })
  add(
    @Param('learningPathId') learningPathId: string,
    @Body() dto: AddPathCourseDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PathCourseResponseDto> {
    return this.service.add(learningPathId, dto, caller);
  }

  @Get()
  @ApiOperation({ summary: "List a learning path's courses, ordered by position" })
  @ApiParam({ name: 'learningPathId', description: 'Learning path UUID' })
  @ApiResponse({ status: 200, type: [PathCourseResponseDto] })
  @ApiResponse({ status: 404, description: 'Learning path not found' })
  findAll(@Param('learningPathId') learningPathId: string): Promise<PathCourseResponseDto[]> {
    return this.service.findByPath(learningPathId);
  }

  @Patch(':courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reorder a course within a learning path (path author, Steward, or Admin)" })
  @ApiParam({ name: 'learningPathId', description: 'Learning path UUID' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, type: PathCourseResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this learning path or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Course is not part of this learning path' })
  reorder(
    @Param('learningPathId') learningPathId: string,
    @Param('courseId') courseId: string,
    @Body() dto: ReorderPathCourseDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PathCourseResponseDto> {
    return this.service.reorder(learningPathId, courseId, dto, caller);
  }

  @Delete(':courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a course from a learning path (path author, Steward, or Admin)' })
  @ApiParam({ name: 'learningPathId', description: 'Learning path UUID' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this learning path or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Course is not part of this learning path' })
  remove(
    @Param('learningPathId') learningPathId: string,
    @Param('courseId') courseId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    return this.service.remove(learningPathId, courseId, caller);
  }
}
