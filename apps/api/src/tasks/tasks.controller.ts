import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { PaginatedTasksResponseDto } from './dto/paginated-tasks-response.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task within a milestone' })
  @ApiResponse({ status: 201, type: TaskResponseDto })
  create(@Body() dto: CreateTaskDto): Promise<TaskResponseDto> { return this.service.create(dto); }

  @Get()
  @ApiOperation({ summary: 'List tasks (filter by milestoneId, status, priority)' })
  @ApiResponse({ status: 200, type: PaginatedTasksResponseDto })
  findAll(@Query() q: ListTasksQueryDto): Promise<PaginatedTasksResponseDto> { return this.service.findAll(q); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  findOne(@Param('id') id: string): Promise<TaskResponseDto> { return this.service.findById(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto): Promise<TaskResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  remove(@Param('id') id: string): Promise<void> { return this.service.remove(id); }
}
