import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { ListMilestonesQueryDto } from './dto/list-milestones-query.dto';
import { MilestoneResponseDto } from './dto/milestone-response.dto';
import { PaginatedMilestonesResponseDto } from './dto/paginated-milestones-response.dto';

@ApiTags('milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a milestone within a journey' })
  @ApiResponse({ status: 201, type: MilestoneResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to act on this journey' })
  create(@Body() dto: CreateMilestoneDto, @CurrentUser() caller: AuthenticatedUser): Promise<MilestoneResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List milestones (journeyId required unless an administrator)' })
  @ApiResponse({ status: 200, type: PaginatedMilestonesResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You must specify a journeyId you own to list milestones' })
  findAll(
    @Query() q: ListMilestonesQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedMilestonesResponseDto> {
    return this.service.findAll(q, caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a milestone by ID' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiResponse({ status: 200, type: MilestoneResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this milestone' })
  @ApiResponse({ status: 404, description: 'Milestone not found' })
  findOne(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<MilestoneResponseDto> {
    return this.service.findById(id, caller);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a milestone' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this milestone' })
  @ApiResponse({ status: 404, description: 'Milestone not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<MilestoneResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a milestone' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this milestone' })
  @ApiResponse({ status: 404, description: 'Milestone not found' })
  remove(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<void> {
    return this.service.remove(id, caller);
  }
}
