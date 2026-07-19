import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { AiOperationalConfigService } from './ai-operational-config.service';
import { UpdateAiOperationalConfigDto } from './dto/update-ai-operational-config.dto';
import { AiOperationalConfigResponseDto } from './dto/ai-operational-config-response.dto';

const ADMIN_ROLES = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

// Platform-wide kill-switch / budget control — tighter than the global 100/min default (PD-001).
const OPERATIONAL_CONFIG_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller('ai/operational-config')
export class AiOperationalConfigController {
  constructor(private readonly service: AiOperationalConfigService) {}

  @Get()
  @ApiOperation({ summary: 'View the live AI operational controls (Platform / System Administrator)' })
  @ApiResponse({ status: 200, type: AiOperationalConfigResponseDto })
  async get(): Promise<AiOperationalConfigResponseDto> {
    return AiOperationalConfigResponseDto.fromEntity(await this.service.getEffective());
  }

  @Patch()
  @Throttle(OPERATIONAL_CONFIG_THROTTLE)
  @ApiOperation({ summary: 'Change the emergency stop or a budget ceiling — takes effect on the next AI request, no restart required (Platform / System Administrator)' })
  @ApiResponse({ status: 200, type: AiOperationalConfigResponseDto })
  async update(
    @Body() dto: UpdateAiOperationalConfigDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<AiOperationalConfigResponseDto> {
    return AiOperationalConfigResponseDto.fromEntity(await this.service.update(dto, caller));
  }
}
