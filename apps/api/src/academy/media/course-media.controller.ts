import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ACADEMY_STAFF_ROLES } from '../common/academy-roles.util';
import { CourseMediaService } from './course-media.service';
import { AddCourseMediaDto } from './dto/add-course-media.dto';
import { CourseMediaResponseDto } from './dto/course-media-response.dto';

@ApiTags('academy')
@Controller('academy/courses/:courseId/media')
export class CourseMediaController {
  constructor(private readonly service: CourseMediaService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach a media asset to a course (or one of its lessons) — course author, Steward, or Admin' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 201, type: CourseMediaResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Course, media asset, or lesson not found' })
  add(
    @Param('courseId') courseId: string,
    @Body() dto: AddCourseMediaDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CourseMediaResponseDto> {
    return this.service.add(courseId, dto, caller);
  }

  @Get()
  @ApiOperation({ summary: "List a course's attached media" })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, type: [CourseMediaResponseDto] })
  @ApiResponse({ status: 404, description: 'Course not found' })
  findAll(@Param('courseId') courseId: string): Promise<CourseMediaResponseDto[]> {
    return this.service.findByCourse(courseId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Detach a media asset from a course (course author, Steward, or Admin)' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiParam({ name: 'id', description: 'CourseMedia UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Course media not found' })
  remove(
    @Param('courseId') courseId: string,
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    return this.service.remove(courseId, id, caller);
  }
}
