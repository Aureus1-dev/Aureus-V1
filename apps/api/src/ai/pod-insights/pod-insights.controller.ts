import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodInsightsService } from './pod-insights.service';
import { InsightResponseDto } from '../insights/dto/insight-response.dto';

const AI_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/pod-insights')
export class PodInsightsController {
  constructor(private readonly service: PodInsightsService) {}

  @Get(':podId')
  @Throttle(AI_THROTTLE)
  @ApiOperation({ summary: 'AI-generated aggregate insight about one Pod — this Pod\'s Steward or Admin (Founder Decision #6)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: InsightResponseDto })
  generateForPod(@Param('podId') podId: string, @CurrentUser() caller: AuthenticatedUser): Promise<InsightResponseDto> {
    return this.service.generateForPod(podId, caller);
  }

  @Get()
  @Throttle(AI_THROTTLE)
  @ApiOperation({ summary: 'Platform-wide, cross-Pod Institutional Wisdom pattern report — Admin only, minimum-Pod-count threshold applies' })
  @ApiResponse({ status: 200, type: InsightResponseDto })
  generatePlatformWide(@CurrentUser() caller: AuthenticatedUser): Promise<InsightResponseDto> {
    return this.service.generatePlatformWide(caller);
  }
}
