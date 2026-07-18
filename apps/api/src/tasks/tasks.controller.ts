import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { PaginatedTasksResponseDto } from './dto/paginated-tasks-response.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task within a milestone' })
  @ApiResponse({ status: 201, type: TaskResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to act on this milestone' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() caller: AuthenticatedUser): Promise<TaskResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: "List tasks — a specific milestone, or (without milestoneId) the caller's own tasks across every milestone" })
  @ApiResponse({ status: 200, type: PaginatedTasksResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this milestone' })
  findAll(
    @Query() q: ListTasksQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedTasksResponseDto> {
    return this.service.findAll(q, caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<TaskResponseDto> {
    return this.service.findById(id, caller);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<TaskResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  remove(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<void> {
    return this.service.remove(id, caller);
  }
}
