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
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleResponseDto } from './dto/module-response.dto';

@ApiTags('academy')
@Controller('academy/courses/:courseId/modules')
export class ModulesController {
  constructor(private readonly service: ModulesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a module to a course (course author, Steward, or Admin)' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 201, type: ModuleResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateModuleDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ModuleResponseDto> {
    return this.service.create(courseId, dto, caller);
  }

  @Get()
  @ApiOperation({ summary: "List a course's modules, ordered by position" })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, type: [ModuleResponseDto] })
  @ApiResponse({ status: 404, description: 'Course not found' })
  findAll(@Param('courseId') courseId: string): Promise<ModuleResponseDto[]> {
    return this.service.findByCourse(courseId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a module (course author, Steward, or Admin)' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiParam({ name: 'id', description: 'Module UUID' })
  @ApiResponse({ status: 200, type: ModuleResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ModuleResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ACADEMY_STAFF_ROLES)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a module (course author, Steward, or Admin)' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiParam({ name: 'id', description: 'Module UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller does not author this course or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    return this.service.remove(id, caller);
  }
}
