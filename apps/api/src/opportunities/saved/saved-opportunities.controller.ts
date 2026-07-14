import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SavedOpportunitiesService } from './saved-opportunities.service';
import { SaveOpportunityDto, UpdateSavedOpportunityDto } from './dto/save-opportunity.dto';
import { SavedOpportunityResponseDto } from './dto/saved-opportunity-response.dto';

@ApiTags('saved-opportunities')
@Controller('users/:userId/saved-opportunities')
export class SavedOpportunitiesController {
  constructor(private readonly service: SavedOpportunitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Save an opportunity for a user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 201, type: SavedOpportunityResponseDto })
  save(
    @Param('userId') userId: string,
    @Body() dto: SaveOpportunityDto,
  ): Promise<SavedOpportunityResponseDto> {
    return this.service.save(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List a user's saved opportunities" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: [SavedOpportunityResponseDto] })
  findAll(@Param('userId') userId: string): Promise<SavedOpportunityResponseDto[]> {
    return this.service.findByUser(userId);
  }

  @Patch(':opportunityId')
  @ApiOperation({ summary: 'Update tracking status, favorite flag, or notes' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, type: SavedOpportunityResponseDto })
  update(
    @Param('userId') userId: string,
    @Param('opportunityId') opportunityId: string,
    @Body() dto: UpdateSavedOpportunityDto,
  ): Promise<SavedOpportunityResponseDto> {
    return this.service.update(userId, opportunityId, dto);
  }

  @Delete(':opportunityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsave (remove) a saved opportunity' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity UUID' })
  remove(
    @Param('userId') userId: string,
    @Param('opportunityId') opportunityId: string,
  ): Promise<void> {
    return this.service.remove(userId, opportunityId);
  }
}
