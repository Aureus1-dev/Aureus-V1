import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { StewardMetricsService } from './steward-metrics.service';
import { StewardMetricsResponseDto } from './dto/steward-metrics-response.dto';

@ApiTags('stewardship')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stewardship/metrics/:stewardId')
export class StewardMetricsController {
  constructor(private readonly service: StewardMetricsService) {}

  @Get()
  @ApiOperation({ summary: "Get a steward's performance metrics (self or Administrator)" })
  @ApiParam({ name: 'stewardId', description: 'Steward user UUID' })
  @ApiResponse({ status: 200, type: StewardMetricsResponseDto })
  @ApiResponse({ status: 403, description: 'You may only view your own metrics' })
  getMetrics(
    @Param('stewardId') stewardId: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<StewardMetricsResponseDto> {
    return this.service.getForSteward(stewardId, caller);
  }
}
