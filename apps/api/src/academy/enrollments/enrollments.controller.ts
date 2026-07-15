import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { EnrollmentsService } from './enrollments.service';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { LessonProgressResponseDto } from './dto/lesson-progress-response.dto';

@ApiTags('academy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('academy')
export class EnrollmentsController {
  constructor(private readonly service: EnrollmentsService) {}

  @Post('courses/:courseId/enroll')
  @ApiOperation({ summary: 'Enroll the caller in a course' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 201, type: EnrollmentResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 409, description: 'Already enrolled in this course' })
  enroll(
    @Param('courseId') courseId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<EnrollmentResponseDto> {
    return this.service.enroll(courseId, caller);
  }

  @Get('enrollments/me')
  @ApiOperation({ summary: "List the caller's enrollments" })
  @ApiResponse({ status: 200, type: [EnrollmentResponseDto] })
  findMine(@CurrentUser() caller: AuthenticatedUser): Promise<EnrollmentResponseDto[]> {
    return this.service.findMine(caller);
  }

  @Get('enrollments/:id')
  @ApiOperation({ summary: 'Get an enrollment by UUID (owner, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, type: EnrollmentResponseDto })
  @ApiResponse({ status: 403, description: 'Caller does not own this enrollment or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<EnrollmentResponseDto> {
    return this.service.findById(id, caller);
  }

  @Get('enrollments/:id/progress')
  @ApiOperation({ summary: "List an enrollment's lesson progress (owner, Steward, or Admin)" })
  @ApiParam({ name: 'id', description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, type: [LessonProgressResponseDto] })
  @ApiResponse({ status: 403, description: 'Caller does not own this enrollment or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  findProgress(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<LessonProgressResponseDto[]> {
    return this.service.findProgress(id, caller);
  }

  @Patch('enrollments/:id/lessons/:lessonId/progress')
  @ApiOperation({ summary: "Update a lesson's progress status for an enrollment (owner, Steward, or Admin) — auto-completes the course and issues a certification when all lessons are COMPLETED" })
  @ApiParam({ name: 'id', description: 'Enrollment UUID' })
  @ApiParam({ name: 'lessonId', description: 'Lesson UUID' })
  @ApiResponse({ status: 200, type: LessonProgressResponseDto })
  @ApiResponse({ status: 403, description: 'Caller does not own this enrollment or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Enrollment or lesson not found' })
  updateLessonProgress(
    @Param('id') id: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonProgressDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<LessonProgressResponseDto> {
    return this.service.updateLessonProgress(id, lessonId, dto, caller);
  }
}
