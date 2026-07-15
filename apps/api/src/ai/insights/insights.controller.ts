import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { InsightsService } from './insights.service';
import { KnowledgeSearchDto } from './dto/knowledge-search.dto';
import { InsightResponseDto } from './dto/insight-response.dto';
import { KnowledgeSearchResponseDto } from './dto/knowledge-search-response.dto';

const AI_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  @Post('opportunities/:id/explain')
  @Throttle(AI_THROTTLE)
  @ApiOperation({ summary: 'AI Opportunity Explanation — plain-language summary of an Opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 201, type: InsightResponseDto })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  @ApiResponse({ status: 503, description: 'The AI service is temporarily unavailable' })
  explainOpportunity(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<InsightResponseDto> {
    return this.service.explainOpportunity(id, caller);
  }

  @Post('resources/:id/explain')
  @Throttle(AI_THROTTLE)
  @ApiOperation({ summary: 'AI Resource Explanation — plain-language summary of a Resource' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 201, type: InsightResponseDto })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 503, description: 'The AI service is temporarily unavailable' })
  explainResource(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<InsightResponseDto> {
    return this.service.explainResource(id, caller);
  }

  @Post('journeys/:id/guidance')
  @Throttle(AI_THROTTLE)
  @ApiOperation({ summary: 'AI Journey Guidance — practical next steps for a Journey the caller owns' })
  @ApiParam({ name: 'id', description: 'Journey UUID' })
  @ApiResponse({ status: 201, type: InsightResponseDto })
  @ApiResponse({ status: 403, description: 'Caller does not own this journey' })
  @ApiResponse({ status: 404, description: 'Journey not found' })
  @ApiResponse({ status: 503, description: 'The AI service is temporarily unavailable' })
  journeyGuidance(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<InsightResponseDto> {
    return this.service.journeyGuidance(id, caller);
  }

  @Post('academy/courses/:id/guidance')
  @Throttle(AI_THROTTLE)
  @ApiOperation({ summary: "AI Academy Guidance — how a course relates to the caller's own goals" })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 201, type: InsightResponseDto })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 503, description: 'The AI service is temporarily unavailable' })
  academyGuidance(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<InsightResponseDto> {
    return this.service.academyGuidance(id, caller);
  }

  @Post('knowledge/search')
  @Throttle(AI_THROTTLE)
  @ApiOperation({ summary: 'AI Knowledge Search — synthesized answer grounded in verified Knowledge articles' })
  @ApiResponse({ status: 201, type: KnowledgeSearchResponseDto })
  @ApiResponse({ status: 503, description: 'The AI service is temporarily unavailable' })
  knowledgeSearch(
    @Body() dto: KnowledgeSearchDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<KnowledgeSearchResponseDto> {
    return this.service.knowledgeSearch(dto, caller);
  }
}
