import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ListGoalsQueryDto } from './dto/list-goals-query.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { PaginatedGoalsResponseDto } from './dto/paginated-goals-response.dto';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly service: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a goal for the caller (or another user, if an administrator)' })
  @ApiResponse({ status: 201, type: GoalResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Cannot create a goal for another user' })
  create(@Body() dto: CreateGoalDto, @CurrentUser() caller: AuthenticatedUser): Promise<GoalResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List goals (scoped to the caller unless an administrator)' })
  @ApiResponse({ status: 200, type: PaginatedGoalsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Cannot list another user\'s goals' })
  findAll(@Query() q: ListGoalsQueryDto, @CurrentUser() caller: AuthenticatedUser): Promise<PaginatedGoalsResponseDto> {
    return this.service.findAll(q, caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a goal by ID' })
  @ApiParam({ name: 'id', description: 'Goal UUID' })
  @ApiResponse({ status: 200, type: GoalResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this goal' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  findOne(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<GoalResponseDto> {
    return this.service.findById(id, caller);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a goal' })
  @ApiParam({ name: 'id', description: 'Goal UUID' })
  @ApiResponse({ status: 200, type: GoalResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this goal' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<GoalResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a goal' })
  @ApiParam({ name: 'id', description: 'Goal UUID' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this goal' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  remove(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<void> {
    return this.service.remove(id, caller);
  }
}
