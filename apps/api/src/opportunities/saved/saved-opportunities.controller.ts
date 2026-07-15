import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus,
  Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { SavedOpportunitiesService } from './saved-opportunities.service';
import { SaveOpportunityDto, UpdateSavedOpportunityDto } from './dto/save-opportunity.dto';
import { SavedOpportunityResponseDto } from './dto/saved-opportunity-response.dto';

@ApiTags('saved-opportunities')
@Controller('users/:userId/saved-opportunities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedOpportunitiesController {
  constructor(private readonly service: SavedOpportunitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Save an opportunity for a user (self only)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 201, type: SavedOpportunityResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only manage their own saved opportunities' })
  save(
    @Param('userId') userId: string,
    @Body() dto: SaveOpportunityDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<SavedOpportunityResponseDto> {
    this.assertSelf(caller, userId);
    return this.service.save(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List a user's saved opportunities (self only)" })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, type: [SavedOpportunityResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only view their own saved opportunities' })
  findAll(
    @Param('userId') userId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<SavedOpportunityResponseDto[]> {
    this.assertSelf(caller, userId);
    return this.service.findByUser(userId);
  }

  @Patch(':opportunityId')
  @ApiOperation({ summary: 'Update tracking status, favorite flag, or notes (self only)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, type: SavedOpportunityResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only manage their own saved opportunities' })
  update(
    @Param('userId') userId: string,
    @Param('opportunityId') opportunityId: string,
    @Body() dto: UpdateSavedOpportunityDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<SavedOpportunityResponseDto> {
    this.assertSelf(caller, userId);
    return this.service.update(userId, opportunityId, dto);
  }

  @Delete(':opportunityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsave (remove) a saved opportunity (self only)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity UUID' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Caller may only manage their own saved opportunities' })
  remove(
    @Param('userId') userId: string,
    @Param('opportunityId') opportunityId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    this.assertSelf(caller, userId);
    return this.service.remove(userId, opportunityId);
  }

  private assertSelf(caller: AuthenticatedUser, userId: string): void {
    if (caller.id !== userId) {
      throw new ForbiddenException('You may only manage your own saved opportunities');
    }
  }
}
