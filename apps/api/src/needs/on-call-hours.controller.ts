import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { NeedEscalationsService } from './need-escalations.service';
import { OnCallHoursResponseDto } from './dto/on-call-hours-response.dto';
import { SetOnCallHoursDto } from './dto/set-on-call-hours.dto';

/**
 * Gate C (C6: Steward escalation) — "honest, published on-call hours."
 * Any authenticated member may read the current rotation before escalating;
 * only a Steward/Platform Administrator may set it, and only to the real
 * rotation (see `PublishedOnCallHours`'s schema comment — never a
 * fabricated placeholder).
 */
@ApiTags('needs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('on-call-hours')
export class OnCallHoursController {
  constructor(private readonly escalations: NeedEscalationsService) {}

  @Get()
  @ApiOperation({ summary: 'The currently published on-call rotation, or null if not yet configured (Gate C — C6)' })
  @ApiResponse({ status: 200, type: OnCallHoursResponseDto })
  getOnCallHours(): Promise<OnCallHoursResponseDto> {
    return this.escalations.getOnCallHours();
  }

  @Patch()
  @ApiOperation({ summary: 'Publish the real on-call rotation (Steward / Platform Administrator only) (Gate C — C6)' })
  @ApiResponse({ status: 200, type: OnCallHoursResponseDto })
  @ApiResponse({ status: 403, description: 'Caller is not a Steward or Platform Administrator' })
  setOnCallHours(
    @Body() dto: SetOnCallHoursDto,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<OnCallHoursResponseDto> {
    return this.escalations.setOnCallHours(dto.hoursDescription, caller);
  }
}
