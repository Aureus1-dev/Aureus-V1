import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ListGoalsQueryDto } from './dto/list-goals-query.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { PaginatedGoalsResponseDto } from './dto/paginated-goals-response.dto';

@ApiTags('goals')
@Controller('goals')
export class GoalsController {
  constructor(private readonly service: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a goal for a user' })
  @ApiResponse({ status: 201, type: GoalResponseDto })
  create(@Body() dto: CreateGoalDto): Promise<GoalResponseDto> { return this.service.create(dto); }

  @Get()
  @ApiOperation({ summary: 'List goals (paginated; filter by userId or status)' })
  @ApiResponse({ status: 200, type: PaginatedGoalsResponseDto })
  findAll(@Query() q: ListGoalsQueryDto): Promise<PaginatedGoalsResponseDto> { return this.service.findAll(q); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a goal by ID' })
  @ApiParam({ name: 'id', description: 'Goal UUID' })
  @ApiResponse({ status: 200, type: GoalResponseDto })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  findOne(@Param('id') id: string): Promise<GoalResponseDto> { return this.service.findById(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a goal' })
  @ApiParam({ name: 'id', description: 'Goal UUID' })
  @ApiResponse({ status: 200, type: GoalResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateGoalDto): Promise<GoalResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a goal' })
  @ApiParam({ name: 'id', description: 'Goal UUID' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> { return this.service.remove(id); }
}
