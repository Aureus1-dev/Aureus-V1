import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodMeetingScheduleService } from './pod-meeting-schedule.service';
import { UpsertScheduleDto } from './dto/upsert-schedule.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';

@ApiTags('pods')
@Controller('pods/:podId/meeting-schedule')
export class PodMeetingScheduleController {
  constructor(private readonly service: PodMeetingScheduleService) {}

  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set this Pod\'s recurring meeting pattern — informational only, never auto-generates events (this Pod\'s Steward or Admin)' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  upsert(
    @Param('podId') podId: string, @Body() dto: UpsertScheduleDto, @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ScheduleResponseDto> {
    return this.service.upsert(podId, dto, caller);
  }

  @Get()
  @ApiOperation({ summary: 'Get this Pod\'s recurring meeting pattern' })
  @ApiParam({ name: 'podId', description: 'Pod UUID' })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  findForPod(@Param('podId') podId: string): Promise<ScheduleResponseDto | null> {
    return this.service.findForPod(podId);
  }
}
