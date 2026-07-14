import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JourneysService } from './journeys.service';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { JourneyResponseDto } from './dto/journey-response.dto';

@ApiTags('journeys')
@Controller('journeys')
export class JourneysController {
  constructor(private readonly service: JourneysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a journey for a goal (one per goal)' })
  @ApiResponse({ status: 201, type: JourneyResponseDto })
  @ApiResponse({ status: 409, description: 'Goal already has a Journey' })
  create(@Body() dto: CreateJourneyDto): Promise<JourneyResponseDto> { return this.service.create(dto); }

  @Get('by-goal/:goalId')
  @ApiOperation({ summary: 'Get the journey for a given goal' })
  @ApiParam({ name: 'goalId', description: 'Goal UUID' })
  @ApiResponse({ status: 200, type: JourneyResponseDto })
  findByGoal(@Param('goalId') goalId: string): Promise<JourneyResponseDto> {
    return this.service.findByGoalId(goalId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a journey by ID' })
  @ApiParam({ name: 'id', description: 'Journey UUID' })
  @ApiResponse({ status: 200, type: JourneyResponseDto })
  findOne(@Param('id') id: string): Promise<JourneyResponseDto> { return this.service.findById(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a journey' })
  @ApiParam({ name: 'id', description: 'Journey UUID' })
  @ApiResponse({ status: 200, type: JourneyResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateJourneyDto): Promise<JourneyResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a journey' })
  @ApiParam({ name: 'id', description: 'Journey UUID' })
  remove(@Param('id') id: string): Promise<void> { return this.service.remove(id); }
}
