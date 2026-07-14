import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { ListMilestonesQueryDto } from './dto/list-milestones-query.dto';
import { MilestoneResponseDto } from './dto/milestone-response.dto';
import { PaginatedMilestonesResponseDto } from './dto/paginated-milestones-response.dto';

@ApiTags('milestones')
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a milestone within a journey' })
  @ApiResponse({ status: 201, type: MilestoneResponseDto })
  create(@Body() dto: CreateMilestoneDto): Promise<MilestoneResponseDto> { return this.service.create(dto); }

  @Get()
  @ApiOperation({ summary: 'List milestones (filter by journeyId or status)' })
  @ApiResponse({ status: 200, type: PaginatedMilestonesResponseDto })
  findAll(@Query() q: ListMilestonesQueryDto): Promise<PaginatedMilestonesResponseDto> { return this.service.findAll(q); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a milestone by ID' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  @ApiResponse({ status: 200, type: MilestoneResponseDto })
  findOne(@Param('id') id: string): Promise<MilestoneResponseDto> { return this.service.findById(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a milestone' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto): Promise<MilestoneResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a milestone' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  remove(@Param('id') id: string): Promise<void> { return this.service.remove(id); }
}
