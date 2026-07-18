import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { AdministrationMetricsService } from './administration-metrics.service';
import { AdministrationMetricsResponseDto } from './dto/administration-metrics-response.dto';

const ADMIN_ROLES = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@ApiTags('administration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller('administration/metrics')
export class AdministrationMetricsController {
  constructor(private readonly service: AdministrationMetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Institutional health metrics — users, pending reviews, escalations, AI spend, database health (Platform / System Administrator)' })
  @ApiResponse({ status: 200, type: AdministrationMetricsResponseDto })
  getMetrics(@CurrentUser() caller: AuthenticatedUser): Promise<AdministrationMetricsResponseDto> {
    return this.service.getMetrics(caller);
  }
}
