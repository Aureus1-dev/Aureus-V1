import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodMetricsService } from './pod-metrics.service';
import { PodMetricsResponseDto } from './dto/pod-metrics-response.dto';

@ApiTags('pods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pods/:podId/metrics')
export class PodMetricsController {
  constructor(private readonly service: PodMetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Aggregate, Pod-level metrics — never per-member (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: PodMetricsResponseDto })
  getForPod(@Param('podId') podId: string, @CurrentUser() caller: AuthenticatedUser): Promise<PodMetricsResponseDto> {
    return this.service.getForPod(podId, caller);
  }
}
