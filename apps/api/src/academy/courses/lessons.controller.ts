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
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonResponseDto } from './dto/lesson-response.dto';

@ApiTags('academy')
@Controller('academy/modules/:moduleId/lessons')
export class LessonsController {
  constructor(private readonly service: LessonsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a lesson to a module (course author, Steward, or Admin)' })
  @ApiParam({ name: 'moduleId', description: 'Module UUID' })
  @ApiResponse({ status: 201, type: LessonResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  create(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<LessonResponseDto> {
    return this.service.create(moduleId, dto, caller);
  }

  @Get()
  @ApiOperation({ summary: "List a module's lessons, ordered by position" })
  @ApiParam({ name: 'moduleId', description: 'Module UUID' })
  @ApiResponse({ status: 200, type: [LessonResponseDto] })
  @ApiResponse({ status: 404, description: 'Module not found' })
  findAll(@Param('moduleId') moduleId: string): Promise<LessonResponseDto[]> {
    return this.service.findByModule(moduleId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a lesson (course author, Steward, or Admin)' })
  @ApiParam({ name: 'moduleId', description: 'Module UUID' })
  @ApiParam({ name: 'id', description: 'Lesson UUID' })
  @ApiResponse({ status: 200, type: LessonResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<LessonResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a lesson (course author, Steward, or Admin)' })
  @ApiParam({ name: 'moduleId', description: 'Module UUID' })
  @ApiParam({ name: 'id', description: 'Lesson UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    return this.service.remove(id, caller);
  }
}
