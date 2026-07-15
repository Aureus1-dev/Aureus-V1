import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { JourneysService } from './journeys.service';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { JourneyResponseDto } from './dto/journey-response.dto';

@ApiTags('journeys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('journeys')
export class JourneysController {
  constructor(private readonly service: JourneysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a journey for a goal (one per goal)' })
  @ApiResponse({ status: 201, type: JourneyResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to act on this goal' })
  @ApiResponse({ status: 409, description: 'Goal already has a Journey' })
  create(@Body() dto: CreateJourneyDto, @CurrentUser() caller: AuthenticatedUser): Promise<JourneyResponseDto> {
    return this.service.create(dto, caller);
  }

  @Get('by-goal/:goalId')
  @ApiOperation({ summary: 'Get the journey for a given goal' })
  @ApiParam({ name: 'goalId', description: 'Goal UUID' })
  @ApiResponse({ status: 200, type: JourneyResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to act on this goal' })
  findByGoal(
    @Param('goalId') goalId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<JourneyResponseDto> {
    return this.service.findByGoalId(goalId, caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a journey by ID' })
  @ApiParam({ name: 'id', description: 'Journey UUID' })
  @ApiResponse({ status: 200, type: JourneyResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this journey' })
  @ApiResponse({ status: 404, description: 'Journey not found' })
  findOne(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<JourneyResponseDto> {
    return this.service.findById(id, caller);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a journey' })
  @ApiParam({ name: 'id', description: 'Journey UUID' })
  @ApiResponse({ status: 200, type: JourneyResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this journey' })
  @ApiResponse({ status: 404, description: 'Journey not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJourneyDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<JourneyResponseDto> {
    return this.service.update(id, dto, caller);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a journey' })
  @ApiParam({ name: 'id', description: 'Journey UUID' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'You do not have permission to access this journey' })
  @ApiResponse({ status: 404, description: 'Journey not found' })
  remove(@Param('id') id: string, @CurrentUser() caller: AuthenticatedUser): Promise<void> {
    return this.service.remove(id, caller);
  }
}
