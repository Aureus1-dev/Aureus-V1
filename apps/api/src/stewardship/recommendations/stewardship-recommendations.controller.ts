import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { StewardshipRecommendationsService } from './stewardship-recommendations.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { RecommendationResponseDto } from './dto/recommendation-response.dto';

@ApiTags('stewardship')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stewardship/relationships/:relationshipId/recommendations')
export class StewardshipRecommendationsController {
  constructor(private readonly service: StewardshipRecommendationsService) {}

  @Post()
  @ApiOperation({ summary: 'Recommend an Opportunity or Resource to the member (assigned steward or Administrator)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiResponse({ status: 201, type: RecommendationResponseDto })
  create(
    @Param('relationshipId') relationshipId: string,
    @Body() dto: CreateRecommendationDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RecommendationResponseDto> {
    return this.service.create(relationshipId, dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'List recommendations (member, assigned steward, or Administrator)' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiResponse({ status: 200, type: [RecommendationResponseDto] })
  findAll(
    @Param('relationshipId') relationshipId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RecommendationResponseDto[]> {
    return this.service.findByRelationship(relationshipId, caller);
  }
}
