import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { RecommendationsService } from './recommendations.service';
import { RequestRecommendationsDto } from './dto/request-recommendations.dto';
import { ListRecommendationsQueryDto } from './dto/list-recommendations-query.dto';
import { RecommendationResponseDto } from './dto/recommendation-response.dto';
import { PaginatedRecommendationsResponseDto } from './dto/paginated-recommendations-response.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'AI Recommendations — generate up to 3 personalized suggestions in a category, grounded in the caller\'s own goals. Never auto-executes anything.' })
  @ApiResponse({ status: 201, type: [RecommendationResponseDto] })
  @ApiResponse({ status: 503, description: 'The AI service is temporarily unavailable' })
  generate(
    @Body() dto: RequestRecommendationsDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RecommendationResponseDto[]> {
    return this.service.generate(dto, caller);
  }

  @Get()
  @ApiOperation({ summary: "List the caller's AI recommendations" })
  @ApiResponse({ status: 200, type: PaginatedRecommendationsResponseDto })
  findAll(
    @Query() query: ListRecommendationsQueryDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PaginatedRecommendationsResponseDto> {
    return this.service.findMine(query, caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recommendation by UUID (owner only)' })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiResponse({ status: 200, type: RecommendationResponseDto })
  findOne(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RecommendationResponseDto> {
    return this.service.findById(id, caller);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a recommendation (owner only) — a status change only; does not enroll/save/act on your behalf' })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiResponse({ status: 201, type: RecommendationResponseDto })
  @ApiResponse({ status: 409, description: 'Recommendation is not PENDING' })
  approve(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RecommendationResponseDto> {
    return this.service.approve(id, caller);
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss a recommendation (owner only)' })
  @ApiParam({ name: 'id', description: 'Recommendation UUID' })
  @ApiResponse({ status: 201, type: RecommendationResponseDto })
  @ApiResponse({ status: 409, description: 'Recommendation is not PENDING' })
  dismiss(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<RecommendationResponseDto> {
    return this.service.dismiss(id, caller);
  }
}
